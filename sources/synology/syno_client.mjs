import axios from 'axios';
import axiosRetry from 'axios-retry';
import tough from 'tough-cookie';
import {wrapper} from 'axios-cookiejar-support';

import https from 'https';
import fs from 'fs';
import logger from "../../config_log.js";
import {
  get as meta_get_source,
  update_cache as meta_update_cache,  
  save_source_dir,
  get_source_dir
} from "../../meta/meta_source.mjs"
import { meta_db } from '../../meta/meta_base.mjs';


const cookieJar = new tough.CookieJar();

//const httpsAgent = new https.Agent({ rejectUnauthorized: false })
export let nas_auth_token = {}
let api_client = null;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


export async function authenticate(source_id, callback) {
  try {    
    return init_syno(source_id, (err, nas_config) => {      
      if (nas_config) {
        if (nas_config.cache && Object.keys(nas_config.cache).length != 0) {
          nas_auth_token[source_id] = JSON.parse(nas_config.cache);
          if (callback)
            callback({ "auth_status": true, "error": {} });
          return;
        }
        //not in cache, lets authenticate
        logger.info(`Authenticating NAS...${source_id}`);
        
        return api_client.get('/auth.cgi', {
          params: {
            api: "SYNO.API.Auth",
            version: 7,
            method: "login",
            account: nas_config.user,
            passwd: nas_config.password,
            enable_syno_token: "yes"
          }
        })
          .then(function (response) {
            nas_config.cache = response.data.data;
            nas_auth_token[source_id] = nas_config.cache;
            if (response.data.error) {
              if ((response.data.error.code) && (response.data.error.code == 407)) {
                const syno_error_msg = "Synology blocked this IP address because it has reached the maximum number of failed login attempts allowed within a specific time period. Please contact Synology system administrator."
                response.data.error["details"] = syno_error_msg
                logger.error(syno_error_msg);
              }
              callback({ "auth_status": false, "error": response.data.error });
            } else {
              return meta_update_cache(nas_config, (update_err, updated_nas_config, status_code) => {
                if (callback)
                  callback({ "auth_status": true, "error": {} });
              });
            }

          })
          .catch(function (error) {
            if (error.code === 'ECONNRESET') {
              logger.error('Connection reset by peer.');
            } else {
              logger.info(error.message);
            }
            if (callback){
              logger.error(error);
              callback({ "auth_status": false, "error": { "message": error } });
            }
          });
      } else {
        if (callback)
          callback({ "auth_status": false, "error": { "message": "unknown" } });
      }
    });

  } catch (error) {
    logger.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

function init_syno(source_id, callback) {  
  meta_get_source(source_id, true, (err, nas_config) => {   
    if (err) {
      logger.error(err);
      callback(err, null);
    } else {
      if (!nas_config) {
        logger.error(`NAS was not configured for ${source_id}!`);
        return;
      }
      api_client = wrapper(axios.create({
        baseURL: nas_config.url,
        withCredentials: true, 
        jar: cookieJar,
        headers: {
          //'Content-Type': 'application/json',
          // Add any other headers you need
        },
      }));

      // Configure retry behavior
      axiosRetry(api_client, {
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {          
          return error.code === 'ECONNRESET' || axiosRetry.isNetworkError(error);
        },
      });
      callback(null, nas_config);
    }
  });

}

async function authenticate_if_required(source_id, callback) {
  if (!nas_auth_token[source_id]) {
    authenticate(source_id, auth_result => {
      callback(auth_result);
    });
  } else {
    callback({ "auth_status": true, "error": {} });
  }
}

export async function list_dir(args, callback) {
  if (!args.offset)
    args.offset = 0
  if (!args.limit)
    args.limit = 1000

  authenticate_if_required(args.source_id, auth_result => {
    if (!auth_result.auth_status) {
      const err_msg = "Authentication failed. Please check the error log and try again later."
      callback({ "message": auth_result }, null);
      return;
    }
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Folder",
      SynoToken: nas_auth_token[args.source_id].synotoken,
      version: 2,
      method: "list",
      offset: args.offset,
      limit: args.limit
    };
    if (args.folder_id > -1) {
      m_param.id = args.folder_id;
    }
    //if id == -1, it will fetch root folder

    api_client.get('/entry.cgi', {
      params: m_param
    })
      .then(function (response) {
        callback(null, response.data);
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
          callback('Connection reset by peer.', null);
        } else {
          logger.info(error.message);
          callback(error, null);
        }
      });
  });

}
export async function get_dir_details(args, callback) {
  if (!args.folder_id) {
    callback({ message: "folder_id is required" }, null);
    return;
  }
  const folder_id = args.folder_id;
  get_source_dir(folder_id, (err, data_details) => {
    if(data_details){
      callback(null, data_details)
    }else{
      args.folder_id = -1; // Start from root
      get_dir_details_recursive(folder_id, args, (err, dir_details) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, dir_details);
        }
      });
    }

  });  
  
}

export async function get_dir_details_recursive(folder_id, args, callback) {
  list_dir(args, (err, data) => {
    if (err || !data || !data.data.list || data.data.list.length === 0) {
      callback({ message: "Directory not found" }, null);
      return;
    }

    for (const sub_dir of data.data.list) {
      const dir_data = {
        "source_id": args.source_id,
        "dir_id" : sub_dir.id,
        "dir_name" : sub_dir.name,
        "parent" : sub_dir.parent
      }
      save_source_dir(dir_data, (err, saved_data_dir) => {});

      if (sub_dir.id == folder_id) {
        callback(null, sub_dir);
        return;
      }
      
    }

    // If not found in this directory, recurse into subdirectories
    let pending = data.data.list.length;
    if (pending === 0) {
      callback({ message: "Directory not found" }, null);
      return;
    }

    for (const sub_dir of data.data.list) {
      get_dir_details_recursive(folder_id, { ...args, folder_id: sub_dir.id }, (err, result) => {
        if (result) {
          callback(null, result);
          return;
        }

        pending--;
        if (pending === 0) {
          callback({ message: "Directory not found" }, null);
        }
      });
    }
  });
}


export async function list_dir_items(args, callback) {
  //this requires fresh auth, so removing cache manually
  // delete nas_auth_token[args.source_id];
  // await meta_clear_cache(args.source_id);

  authenticate_if_required(args.source_id, auth_result => {
    if (!auth_result.auth_status) {
      const err_msg = "Authentication failed. Please check the error log and try again later."
      callback({ "message": auth_result }, null);
      return;
    }
    
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Item",
      SynoToken: nas_auth_token[args.source_id].synotoken,
      version: 2,
      method: "list",
      "folder_id": args.folder_id,
      offset: args.offset,
      limit: args.limit,
      additional: "[\"thumbnail\", \"resolution\",\"orientation\",\"provider_user_id\", \"tag\", \"geocoding_id\", \"address\", \"person\"]"

    };

    api_client.get('/entry.cgi', {
      params: m_param,
      withCredentials: true
    })
      .then(function (response) {
        callback(null, response.data);
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
          callback('Connection reset by peer.', null);
        } else {
          logger.info(error.message);
          callback(error, null);
        }
      });
  });
}


export async function listPersons(args, callback) {
  authenticate_if_required(args.source_id, auth_result => {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Person",
      SynoToken: nas_auth_token[args.source_id].synotoken,
      _sid: nas_auth_token[args.source_id].sid,
      version: 2,
      method: "list",
      offset: args.offset,
      limit: args.limit
    };

    api_client.get('/entry.cgi', {
      params: m_param
    })
      .then(function (response) {
        callback(null, response.data);
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
          callback('Connection reset by peer.', null);
        } else {
          logger.info(error.message);
          callback(error, null);
        }
      });
  });
}

export function listPersonsAsync(args) {
  return new Promise((resolve, reject) => {
    listPersons(args, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

export async function list_geo(source_id, offset = 0, limit = 1000) {
  return authenticate_if_required(source_id, auth_result => {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Geocoding",
      SynoToken: nas_auth_token[source_id].synotoken,
      version: 1,
      method: "list",
      offset: offset,
      limit: limit
    };

    return api_client.get('/entry.cgi', {
      params: m_param
    })
      .then(function (response) {
        logger.info(response.data);
        // if(!valid_response(response)){
        //   logger.info("Retrying...")
        //   list_geo(offset = offset, limit = limit);
        // }
        return response.data;
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
        } else {
          logger.info(error.message);
        }
      });

  });
}

export async function get_photo(photo_data, size = "sm", callback) {  
 
  return authenticate_if_required(photo_data.source_id, auth_result => {
    if (!auth_result.auth_status) {      
      //const err_msg = "Authentication failed. Please check the error log and try again later."
      callback({ "message": auth_result.error }, null);
      return;
    }

    //for any reason still we dont have token
    if (!nas_auth_token[photo_data.source_id]) {      
      callback("Cannot communicate with Synology as there is no auth token. Mostly it happens when server is not able to decrypt cache.", null);
      return;
    }

    let m_param = {
      api: "SYNO.FotoTeam.Thumbnail",
      SynoToken: nas_auth_token[photo_data.source_id].synotoken,
      version: 2,
      method: "get",
      id: photo_data.photo_id,
      cache_key: photo_data.cache_key,
      type: "unit",
      size: size
    };

    return api_client.get('/entry.cgi', {
      params: m_param,
      responseType: 'arraybuffer'
    })
      .then(function (response) {
        callback(null, response);
      })
      .catch(function (error) {
        let err_info = "Error getting photo from Synology. The server returned ";
        err_info += error + ". ";
        err_info += `The request was for ${photo_data.id}, ${photo_data.cache_key}`;
        logger.error(err_info);
        callback(err_info, null);
      });

  });
}

export async function create_eyedeea_tags(source_id) {
  let eyedeea_tags = ["eyedeea_dns", "eyedeea_mark"];
  eyedeea_tags.forEach(eyedeea_tag => {
    create_tag(source_id, eyedeea_tag, (err, result) => {
      if (!err) {
        const query = `insert or ignore into tag(name, syno_id) values (?, ?)`;
        meta_db.run(query, [eyedeea_tag, result.data.tag.id], (err) => {
          if (err) {
            logger.error(err.message);
          } else {
            logger.info(`Tag ${eyedeea_tag} created successfully.`);
          }
        });
      }
    });
  });
}

export async function create_tag(source_id, name, callback) {
  return authenticate_if_required(source_id, auth_result => {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.GeneralTag",
      SynoToken: nas_auth_token[source_id].synotoken,
      _sid: nas_auth_token[source_id].sid,
      version: 1,
      method: "create",
      name: name
    };

    return api_client.get('/entry.cgi', {
      params: m_param
    })
      .then(function (response) {
        callback(null, response.data);
      })
      .catch(function (error) {
        let err_info = `Could not create tag '${name}' in Synology. The server returned `;
        err_info += error + ". ";
        logger.error(err_info);
        callback(err_info, null);
      });

  });
}

export async function add_tag(source_id, photo_id, tag_id) {
  return authenticate_if_required(source_id, auth_result => {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Item",
      SynoToken: nas_auth_token[source_id].synotoken,
      version: 2,
      method: "add_tag",
      id: photo_id,
      tag: tag_id
    };

    return api_client.get('/entry.cgi', {
      params: m_param
    })
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        let err_info = `Could not set tag '${tag_id}' to ${photo_id} in Synology. The server returned `;
        err_info += error + ". ";
        logger.error(err_info);
      });

  });
}
