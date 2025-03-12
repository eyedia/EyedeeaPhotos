import fs from 'fs';
import path from 'path';
import exifr from 'exifr';
import { Client as google_client } from "@googlemaps/google-maps-services-js";
import config_log from "../../config_log.js";
import { get as meta_get_source } from "../../meta/meta_source.mjs";
import {
    get_geo_address as meta_get_geo_address,
    save_geo_address as meta_save_geo_address
} from "../../meta//meta_scan.mjs"

const logger = config_log.logger;
export let fs_config = {};
export let total_geo_apis = 0;

export function reset_fs_client() {
    total_geo_apis = 0;
}

export async function authenticate(source_id, callback) {
    meta_get_source(source_id, true, (err, source) => {
        if (err) {
            logger.error(err.message);
            if (callback)
                callback({ "auth_status": false, "error": { "message": err.message } });
        } else {
            if (!source) {
                callback({ "auth_status": false, "error": { "message": err } });
                logger.error("FS was not configured!");
                return;
            }
            fs_config[source_id] = source;
            if (!fs.existsSync(source.url)) {
                const message = `The directory ${source.url} does not exist or not accessible!`
                callback({ "auth_status": false, "error": { "message": message } });
                logger.error(message);
                return;
              }
            if (callback)
                callback({ "auth_status": true, "error": {} });
        }
    });
}

export function get_exif_data(source_id, photo_path, callback) {
    let extracted_exif_data = {
        "create_date": undefined,
        "tags": undefined,
        "address": undefined
    }
    try {
        if (!photo_path)
            return;
        if (!fs.existsSync(photo_path))
            return;

        exifr.parse(photo_path)
            .then(exif_data => {
                if (!exif_data) {
                    callback(null, extracted_exif_data);
                    return;
                }
                //other exif data
                if (exif_data.hasOwnProperty("CreateDate"))
                    extracted_exif_data.create_date = new Date(exif_data.CreateDate).getTime() / 1000;

                if (exif_data.hasOwnProperty("XPKeywords"))
                    extracted_exif_data.tags = exif_data.XPKeywords;
                
                //geo reverse coding starts
                if (!exif_data.latitude || !exif_data.longitude) {
                    callback(null, extracted_exif_data);
                    return;
                }
                meta_get_geo_address(parseFloat(exif_data.latitude).toFixed(5), parseFloat(exif_data.longitude).toFixed(5), meta_address_data => {
                    if (meta_address_data) {
                        extracted_exif_data.address = meta_address_data.address;
                        callback(null, extracted_exif_data);
                    } else {
                        get_address_using_geo_reverse(source_id, exif_data.latitude, exif_data.longitude, (err, address) => {
                            if (err) {
                                logger.error(err);
                                callback(err, extracted_exif_data);
                            } else {
                                save_geo_address(exif_data.latitude, exif_data.longitude, address);
                                extracted_exif_data.address = address;
                                callback(null, extracted_exif_data);
                            }
                        });
                    }
                });

            });
    } catch (error) {
        logger.error(error);
        callback(err, extracted_exif_data);
    }
}

function save_geo_address(latitude, longitude, address) {
    let json_data = {
        "latitude": parseFloat(latitude).toFixed(5),
        "longitude": parseFloat(longitude).toFixed(5),
        "address": JSON.stringify(address)
    }
    meta_save_geo_address(json_data);
}

function get_address_using_geo_reverse(source_id, lat, lng, callback) {
    get_geo_reverse(source_id, lat, lng, (err, address_data) => {
        if (err) {
            callback(err, null);
            return;
        }
        let formatted_address = {
            "country": "",
            "country_id": "",
            "state": "",
            "state_id": "",
            "county": "",
            "county_id": "",
            "city": "",
            "city_id": "",
            "town": "",
            "town_id": "",
            "district": "",
            "district_id": "",
            "village": "",
            "village_id": "",
            "route": "",
            "route_id": "",
            "landmark": "",
            "landmark_id": ""
        }
        if (address_data[0].address_components) {
            for (const component of address_data[0].address_components) {
                if (component.types.includes("street_number")) {
                    formatted_address["route_id"] = component.long_name;
                }
                if (component.types.includes("route")) {
                    formatted_address["route"] = component.long_name;
                }
                if (component.types.includes("locality")) {
                    formatted_address["city"] = component.long_name;
                    formatted_address["town"] = component.long_name;
                }
                if (component.types.includes("administrative_area_level_2")) {
                    formatted_address["county"] = component.long_name;
                }
                if (component.types.includes("administrative_area_level_1")) {
                    formatted_address["state"] = component.long_name;
                }
                if (component.types.includes("country")) {
                    formatted_address["country"] = component.long_name;
                }
                if (component.types.includes("neighborhood")) {
                    formatted_address["landmark"] = component.long_name;
                }
            }
        }
        callback(null, formatted_address);
    });
}

async function get_geo_reverse(source_id, lat, lng, callback) {
    authenticate_if_required(source_id, auth_result => {
    if (!fs_config || !fs_config[source_id].config || !fs_config[source_id].config.GOOGLE_MAPS_API_KEY) {
        callback("FS source was not configured or GOOGLE_MAPS_API_KEY was not set! Cannot use Google map API.", null);
        return;
    }

    if (!lat || !lng) {
        callback(null, null);
        return;
    }
    total_geo_apis++;
    const m_client = new google_client({});
    m_client
        .reverseGeocode({
            params:
            {
                latlng: { lat, lng },
                key: fs_config[source_id].config.GOOGLE_MAPS_API_KEY,
            },

        })
        .then((response) => {
            if (response.data)
                callback(null, response.data.results);
            else
                logger.error(null, { "lat": lat, "lng": lng });
        })
        .catch((err) => {
            logger.error(err);
        });
    });
}

export async function get_photo(photo_data, res) {
    fs.readFile(photo_data.filename, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading image file.');
            return;
        }
        photo_data.filename = path.basename(photo_data.filename);
        res.writeHead(200, { 
            'Content-Type': 'image/jpeg',
            'photo-data': JSON.stringify(photo_data)
        });
        res.end(data);
    });
}

async function authenticate_if_required(source_id, callback) {
  if (!fs_config[source_id]) {
    authenticate(source_id, auth_result => {
      callback(auth_result);
    });
  } else {
    callback({ "auth_status": true, "error": {} });
  }
}