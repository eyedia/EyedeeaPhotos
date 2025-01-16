import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import dotenv from 'dotenv';
import fs from 'fs';
import config_log from "../../../config_log.js";

const logger = config_log.logger;
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const api_client = axios.create({
  baseURL: "https://192.168.86.218:5001/webapi",
  timeout: 5000,
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

export let nas_auth_token = {}

export async function authenticate() {
  try {
    //read from cache
    nas_auth_token = await read_cache()
      .then(data => {
        if (data) {
          return data;
        }
      })
      .catch(error => {
        return nas_auth_token;
      });

    if (Object.keys(nas_auth_token).length != 0) {
      logger.info("NAS Auth initiated from cache!");
      return;
    }

    //not in cache, lets authenticate
    api_client.get('/auth.cgi', {
      params: {
        api: "SYNO.API.Auth",
        version: 7,
        method: "login",
        account: process.env.nas_user,
        passwd: process.env.nas_password,
        enable_syno_token: "yes"
      },
      httpsAgent: httpsAgent
    })
      .then(function (response) {
        nas_auth_token = response.data.data;
        write_cache(nas_auth_token);
        logger.info(nas_auth_token);
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer.');
        } else {
          logger.info(error.message);
        }
      });

    return;

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
        logger.info(error);
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