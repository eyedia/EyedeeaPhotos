import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import fs from 'fs';
import config_log from "../../../config_log.js";
import { get as meta_get_source, update_cache as meta_update_cache } from "../../../meta/meta_source.mjs"

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
      if(!nas_config){
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


export async function authenticate() {
  try {
    init_syno((err, nas_config) => {
      if (nas_config) {
        //read from cache
        // nas_auth_token = read_cache()
        //   .then(data => {
        //     if (data) {
        //       return data;
        //     }
        //   })
        //   .catch(error => {
        //     return nas_auth_token;
        //   });

        if (nas_config.cache && Object.keys(nas_config.cache).length != 0) {
          logger.info("NAS Auth initiated from cache!");
          return;
        }
        
        //not in cache, lets authenticate
        logger.info("Authenticating NAS...");
        api_client.get('/auth.cgi', {
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
            logger.info(response.data);
            meta_update_cache(nas_config, (update_err, updated_nas_config, status_code) =>{
              logger.info(nas_config.cache);
            });
            l
          })
          .catch(function (error) {
            if (error.code === 'ECONNRESET') {
              logger.error('Connection reset by peer.');
            } else {
              logger.info(error.message);
            }
          });

        return;
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

function valid_response(response) {
  logger.info(response.data.success);
  if (!response.data.success) {
    if (response.data.error.code === 119) {
      logger.info("here");
      fs.unlink(".cache", (err) => {
        logger.info("Cache cleared! re-authenticating...");
        authenticate();
      });

      return false;
    }
  }

  return true;
}

export async function get_photo(id, cache_key, size = "sm") {
  if (!nas_auth_token) {
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

function read_cache() {
  return new Promise((resolve, reject) => {
    fs.readFile('.cache', 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    })
  });
}

function write_cache(data) {
  fs.writeFile('.cache', JSON.stringify(data), (err) => {
    if (err) throw err;
    logger.info('The file has been saved!');
  });
}