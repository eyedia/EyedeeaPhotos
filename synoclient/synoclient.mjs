import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

const httpsAgent = new https.Agent({ rejectUnauthorized: false })
const env = dotenv.config();
export let nas_auth_token = {}

export async function authenticate() {
  try {
    axios.get(process.env.nas_url + '/auth.cgi', {
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


export async function photos_teams_get_dir_items(id = -1, folder_id = -1, offset = 0, limit = 100) {
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Browse.Folder",
      version: 2,
      method: "list",
      SynoToken: nas_auth_token.synotoken,
      offset: offset,
      limit: limit
    };
    if (id > -1) {
      m_param.id = id;
    }

    if (folder_id > -1) {
      m_param.api = "SYNO.FotoTeam.Browse.Item";
      m_param.folder_id = folder_id;
      m_param.additional = "[\"thumbnail\"]";
    }

    return axios.get(process.env.nas_url + '/entry.cgi', {
      params: m_param,
      httpsAgent: httpsAgent
    })
      .then(function (response) {        
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

export async function photos_teams_get_photo(id, cache_key, size = "sm") {
  try {
    let m_param = {
      api: "SYNO.FotoTeam.Thumbnail",
      version: 2,
      method: "get",
      id: id,
      cache_key: cache_key,
      type: "unit",
      size: size,
      SynoToken: nas_auth_token.synotoken,
      offset: 0,
      limit: 100
    };

    return axios.get(process.env.nas_url + '/entry.cgi', {
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