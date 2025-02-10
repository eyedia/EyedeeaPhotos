import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import fs from 'fs';
import config_log from "../../../config_log.js";
import {
  get as meta_get_source,
  update_cache as meta_update_cache,
  clear_cache as meta_clear_cache
} from "../../../meta/meta_source.mjs"
import { meta_db } from '../../../meta/meta_base.mjs';

const logger = config_log.logger;
const httpsAgent = new https.Agent({ rejectUnauthorized: false })
export let nas_auth_token = {}

let api_client = null;
//let nas_url = "https://192.168.86.218:5001/webapi";

function init_syno(callback) {
  meta_get_source("nas", (err, nas_config) => {
    if (err) {
      logger.error(err.message);
      callback(err, null);
    } else {
      if (!nas_config) {
        logger.error("NAS was not configured!");
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


export async function authenticate(callback) {
  try {
    return init_syno((err, nas_config) => {
      if (nas_config) {
        if (nas_config.cache && Object.keys(nas_config.cache).length != 0) {          
          nas_auth_token = JSON.parse(nas_config.cache);
          logger.info("NAS Auth initiated from cache!");
          if(callback)
            callback(true);
          return;
        }
        //not in cache, lets authenticate
        logger.info("Authenticating NAS...");
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
            nas_auth_token = nas_config.cache;
            return meta_update_cache(nas_config, (update_err, updated_nas_config, status_code) => {
              if(callback)
                callback(true);
            });
           
          })
          .catch(function (error) {
            if (error.code === 'ECONNRESET') {
              logger.error('Connection reset by peer.');
            } else {
              logger.info(error.message);
            }
            if(callback)
              callback(false);
          });
      }else{
        if(callback)
          callback(false);
      }
    });

  } catch (error) {
    logger.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}


export async function list_dir(folder_id = -1, offset = 0, limit = 1000) {
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Folder",
      SynoToken: nas_auth_token.synotoken,
      version: 2,
      method: "list",
      offset: offset,
      limit: limit
    };
    if (folder_id > -1) {
      m_param.id = folder_id;
    }
    //if id == -1, it will fetch root folder

    return api_client.get('/entry.cgi', {
      params: m_param,
      httpsAgent: httpsAgent
    })
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
        } else {
          logger.info(error.message);
        }
      });

  } catch (error) {
    logger.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

export async function list_dir_items(folder_id, offset = 0, limit = 1000) {
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Item",
      SynoToken: nas_auth_token.synotoken,
      version: 2,
      method: "list",
      "folder_id": folder_id,
      offset: offset,
      limit: limit,
      additional: "[\"thumbnail\", \"resolution\",\"orientation\",\"provider_user_id\", \"tag\", \"geocoding_id\", \"address\"]"

    };

    return api_client.get('/entry.cgi', {
      params: m_param,
      httpsAgent: httpsAgent
    })
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
        } else {
          logger.info(error.message);
        }

      });

  } catch (error) {
    logger.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}


export async function list_geo(offset = 0, limit = 1000) {
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Geocoding",
      SynoToken: nas_auth_token.synotoken,
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

  } catch (error) {
    logger.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}


export async function get_photo(id, cache_key, size = "sm") { 
  if (!nas_auth_token.synotoken) {
    throw new Error('Synology client is not active! Most likely authentication was failed. Please check the server configuration and logs and try again.');
  }
  try {    
    let m_param = {
      api: "SYNO.FotoTeam.Thumbnail",
      SynoToken: nas_auth_token.synotoken,
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

  } catch (error) {
    logger.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

export async function create_eyedeea_tags() {
  let eyedeea_tags = ["eyedeea_dns", "eyedeea_mark"];
  eyedeea_tags.forEach(eyedeea_tag => {
    create_tag(eyedeea_tag).then(result => {
      const query = `insert or ignore into tag(name, syno_id) values (${eyedeea_tag}, ${result.data.tag.id})`;
        meta_db.run(query, (err) => {
            if (err) {
                logger.error(err.message);
            } else {
                logger.info(`${eyedeea_tag} created successfully.`);
            }
        });
    });
  });
}

export async function create_tag(name) {

  if (!nas_auth_token.synotoken) {
    throw new Error('Synology client is not active! Most likely authentication was failed. Please check the server configuration and logs and try again.');
  }
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.GeneralTag",
      SynoToken: nas_auth_token.synotoken,
      _sid: nas_auth_token.sid,
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

  } catch (error) {
    logger.error('Could not create tag:', error.response?.data || error.message);
    throw error;
  }
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
    return callback({"retry": false, "data": data});;
  } else {
    return callback({"retry": false, "data": data});;
  }

}
