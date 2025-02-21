import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import fs from 'fs';
import config_log from "../../config_log.js";
import {
  get as meta_get_source,
  update_cache as meta_update_cache,
  clear_cache as meta_clear_cache
} from "../../meta/meta_source.mjs"
import { meta_db } from '../../meta/meta_base.mjs';

const logger = config_log.logger;
const httpsAgent = new https.Agent({ rejectUnauthorized: false })
export let nas_auth_token = {}

let api_client = null;

export async function authenticate(source_id, callback) {  
  try {
    return init_syno(source_id, (err, nas_config) => {
      if (nas_config) {
        if (nas_config.cache && Object.keys(nas_config.cache).length != 0) {
          nas_auth_token[source_id] = JSON.parse(nas_config.cache);
          logger.info("NAS Auth initiated from cache!");
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
          },
          httpsAgent: httpsAgent
        })
          .then(function (response) {
            nas_config.cache = response.data.data;
            nas_auth_token[source_id] = nas_config.cache;
            if (response.data.error) {
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
            if (callback)
              callback({ "auth_status": false, "error": { "message": error } });
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

  meta_get_source(source_id, (err, nas_config) => {
    if (err) {
      logger.error(err.message);
      callback(err, null);
    } else {
      if (!nas_config) {
        logger.error(`NAS was not configured for ${source_id}!`);
        return;
      }
      api_client = axios.create({
        baseURL: nas_config.url,
        headers: {
          //'Content-Type': 'application/json',
          // Add any other headers you need
        },
      });

      // Configure retry behavior
      axiosRetry(api_client, {
        retries: 3, // Number of retries
        retryDelay: axiosRetry.exponentialDelay, // Exponential backoff
        retryCondition: (error) => {
          // Retry on ECONNRESET and network errors
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
  }else{
    callback({ "auth_status": true, "error": {} });
  }
}

export async function list_dir(args, callback) {
  authenticate_if_required(args.source_id, auth_result => {
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
      params: m_param,
      httpsAgent: httpsAgent
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

export async function list_dir_items(args, callback) {
  authenticate_if_required(args.source_id, auth_result => {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Item",
      SynoToken: nas_auth_token[args.source_id].synotoken,
      version: 2,
      method: "list",
      "folder_id": args.folder_id,
      offset: args.offset,
      limit: args.limit,
      additional: "[\"thumbnail\", \"resolution\",\"orientation\",\"provider_user_id\", \"tag\", \"geocoding_id\", \"address\"]"

    };

    api_client.get('/entry.cgi', {
      params: m_param,
      httpsAgent: httpsAgent
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
      params: m_param,
      httpsAgent: httpsAgent
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

export async function get_photo(source_id, id, cache_key, size = "sm") {
  logger.info(`Authenticating ....pppp ${source_id}!`);
  return authenticate_if_required(source_id, auth_result => {
    let m_param = {
      api: "SYNO.FotoTeam.Thumbnail",
      SynoToken: nas_auth_token[source_id].synotoken,
      version: 2,
      method: "get",
      id: id,
      cache_key: cache_key,
      type: "unit",
      size: size
    };

    return api_client.get('/entry.cgi', {
      params: m_param,
      responseType: 'arraybuffer',
      httpsAgent: httpsAgent
    })
      .then(function (response) {
        return response;
      })
      .catch(function (error) {
        let err_info = "Error getting photo from Synology. The server returned ";
        err_info += error + ". ";
        err_info += `The request was for ${id}, ${cache_key}`;
        logger.error(err_info);
      });

  });
}

export async function create_eyedeea_tags(source_id) {
  let eyedeea_tags = ["eyedeea_dns", "eyedeea_mark"];
  eyedeea_tags.forEach(eyedeea_tag => {
    create_tag(source_id, eyedeea_tag).then(result => {
      const query = `insert or ignore into tag(name, syno_id) values ('${eyedeea_tag}', ${result.data.tag.id})`;
      meta_db.run(query, (err) => {
        if (err) {
          logger.error(err.message);
        } else {
          logger.info(`Tag ${eyedeea_tag} created successfully.`);
        }
      });
    });
  });
}

export async function create_tag(source_id, name) {
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
      params: m_param,
      httpsAgent: httpsAgent
    })
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        let err_info = `Could not create tag '${name}' in Synology. The server returned `;
        err_info += error + ". ";
        logger.error(err_info);
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
      params: m_param,
      httpsAgent: httpsAgent
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

function check_valid_data(data, callback) {

  if (data.error) {
    if (data.error.code && data.error.code == 119) {
      logger.info("Server returned error code 119. Preparing to re-authenticate. Clearing cache...");
      meta_clear_cache("nas", (err, nas) => {
        if (err) {
          logger.error(err.message);
          //callback(err, null);
        } else {
          if (!nas) {
            logger.error("Could not clear cache of NAS!");
            //callback(err, null);
          } else {
            logger.info("cache cleared...")
            // authenticate(result => {
            //   if(result)
            //     callback({"retry": true, "data": data});
            //   else{
            //     logger.error("Fatal error while clear cache and re-authentication!");
            //   }
            // });
          }
        }
      });
    }
    return callback({ "retry": false, "data": data });;
  } else {
    return callback({ "retry": false, "data": data });;
  }

}
