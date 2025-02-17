import fs from 'fs';
import exifr from 'exifr/dist/full.esm.mjs';
import { Client as google_client } from "@googlemaps/google-maps-services-js";
import config_log from "../../config_log.js";
import { get as meta_get_source } from "../../meta/meta_source.mjs";

const logger = config_log.logger;
export let fs_config = null;

export async function authenticate(callback) {
    meta_get_source("fs", (err, fs_config_from_db) => {
        if (err) {
            logger.error(err.message);
            if (callback)
                callback(err, null);
        } else {
            if (!fs_config_from_db) {
                logger.error("FS was not configured!");
                return;
            }
            fs_config = fs_config_from_db;
            if (callback)
                callback(null, fs_config_from_db);
        }
    });
}

export function get_address_from_exif(photo_path, callback) {
    try {
        if (!photo_path)
            return;
        if (!fs.existsSync(photo_path))
            return;
        
        exifr.parse(photo_path)
            .then(exif_data => {
                //console.log(exif_data);
                //console.log('Camera:', exif_data.latitude, exif_data.longitude);
                if(!exif_data.latitude || !exif_data.longitude){
                    callback(null, null);
                    return;
                }
                get_address_using_geo_reverse(exif_data.latitude, exif_data.longitude, (err, address) => {
                    if (err) {
                        logger.error(err);
                        callback(err, null);
                    } else {
                        callback(null, address);
                    }
                });
            });
    } catch (error) {
        logger.error(error);
        callback(err, null);
    }
}

function get_address_using_geo_reverse(lat, lng, callback) {
    get_geo_reverse(lat, lng, (err, address_data) => {
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

async function get_geo_reverse(lat, lng, callback) {
    if (!fs_config || !fs_config.config.GOOGLE_MAPS_API_KEY) {
        callback("FS source was not configured or GOOGLE_MAPS_API_KEY was not set! Cannot use Google map API.", null);
        return;
    }

    if(!lat || !lng){
        callback(null, null);
        return;
    }

    const m_client = new google_client({});
    m_client
        .reverseGeocode({
            params:
            {
                latlng: { lat, lng },
                key: fs_config.config.GOOGLE_MAPS_API_KEY,
            },

        })
        .then((response) => {
            if (response.data)
                callback(null, response.data.results);
            else
                console.log(null, {"lat": lat, "lng": lng});
        })
        .catch((err) => {
            logger.error(err);
        });
}

export async function get_photo(photo_data, res) {
    fs.readFile(photo_data.filename, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading image file.');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
    });
}

