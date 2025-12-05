import { list_dir, list_dir_items, get_dir_details, listPersons, list_geo, get_photo } from "../../sources/synology/syno_client.mjs";
import logger from "../../config_log.js";



export const get_root_folders = async (req, res) => {
    let offset = undefined;
    if (req.query.offset) {
      offset = req.query.offset;
    }

    let limit = undefined;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    let args = {
      "source_id": req.params.id,
      "folder_id": undefined,
      "offset": offset,
      "limit": limit
    }    
    list_dir(args, (err, data) => {
      if (data) {
        res.json(data);
      }else{
        res.status(400).json({"message": "Not found"});
      }
    }).catch((err) => {
      res.status(500).send(err);
  });
  
};

export const get_folders = async (req, res) => {  
    const folder_id = req.params.folder_id;

    let offset = undefined;
    if (req.query.offset) {
      offset = req.query.offset;
    }

    let limit = undefined;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    let args = {
      "source_id": req.params.id,
      "folder_id": folder_id,
      "offset": offset,
      "limit": limit
    }    
    list_dir(args, (err, data) => {
      if (data) {
        get_dir_details(args, (err, folder_details) => {
          if(err){
            res.json(data);
          }else{
            data["details"] = folder_details;
            res.json(data);
          }
        });
        
      }else{
        res.status(400).json({"message": "Not found"});
      }
    }).catch((err) => {
      res.status(500).send(err);
  });
};

export const get_items = async (req, res) => { 
    const folder_id = req.params.folder_id;

    let offset = undefined;
    if (req.query.offset) {
      offset = req.query.offset;
    }

    let limit = undefined;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    let args = {
      "source_id":  req.params.id,
      "folder_id": folder_id,
      "offset": offset,
      "limit": limit
  }
  list_dir_items(args, (err, data) => {
      if (data) {
        res.json(data);
      }else{
        res.status(400).json({"message": "Not found"});
      }
    }).catch((err) => {
      res.status(500).send(err);
  });
};


export const get_persons = async (req, res) => { 

  let offset = undefined;
  if (req.query.offset) {
    offset = req.query.offset;
  }

  let limit = undefined;
  if (req.query.limit) {
    limit = req.query.limit;
  }

  let args = {
    "source_id":  req.params.id,
    "offset": offset,
    "limit": limit
}
listPersons(args, (err, data) => {
    if (data) {
      res.json(data);
    }else{
      res.status(400).json({"message": "Not found"});
    }
  }).catch((err) => {
    res.status(500).send(err);
});
};

export const get_stats = async (req, res) => {
  try {
    const photo_id = req.params.photo_id;
    const users = ["u1", "u2"];   //await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};