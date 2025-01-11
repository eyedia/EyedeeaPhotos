import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import dotenv from 'dotenv';
import fs from 'fs';

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const api_client = axios.create({
  baseURL: "https://192.168.86.218:5001/webapi",
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

const env = dotenv.config();
const max_retry = 3;
let retry_count = 0;

export let nas_auth_token = {}

export async function authenticate() {
  try {
    //read from cache
    nas_auth_token = await read_cache()
    .then(data => {
      if(data){
        return data;
      }
    })
    .catch(error => {      
      return nas_auth_token;
    });
    
    if(Object.keys(nas_auth_token).length != 0){
      console.log("NAS Auth initiated from cache!");
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
        console.log(nas_auth_token);
      })
      .catch(function (error) {
        console.log(error);
      });

    return;

  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}


export async function list_dir(id = -1, folder_id = -1, offset = 0, limit = 100) {  
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Folder",
      SynoToken: nas_auth_token.synotoken,
      version: 2,
      method: "list",      
      offset: offset,
      limit: limit
    };    
    if (id > -1) {
      m_param.id = id;
    }

    if (folder_id > -1) {
      m_param.api = "SYNO.FotoTeam.Browse.Item";
      m_param.folder_id = folder_id;
      m_param.additional = "[\"thumbnail\", \"resolution\",\"orientation\",\"provider_user_id\", \"tag\", \"geocoding_id\"]";
    }

    return api_client.get('/entry.cgi', {
      params: m_param,
      httpsAgent: httpsAgent
    })
      .then(function (response) {        
        return response.data;
      })
      .catch(function (error) {
        if (error.code === 'ECONNRESET') {
          console.error('Connection reset by peer.');
        } else {
        console.log(error);
        }
      });

  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}


export async function list_geo(offset = 0, limit = 100) { 
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
        console.log(response.data);
        // if(!valid_response(response)){
        //   console.log("Retrying...")
        //   list_geo(offset = offset, limit = limit);
        // }
        return response.data;
      })
      .catch(function (error) {
        console.log(error);
      });

  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

function valid_response(response){
  console.log(response.data.success);
  if(!response.data.success){    
    if(response.data.error.code === 119){
      console.log("here");
      fs.unlink(".cache", (err) => {
        console.log("Cache cleared! re-authenticating...");
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
        console.log(error);
      });

  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

function read_cache(){
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

function write_cache(data){
  fs.writeFile('.cache', JSON.stringify(data), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
}