import { list_dir } from "./syno_client.mjs"
import { save_photo } from "../meta/metadata.mjs"

let loop_count = 0;

export async function scan() {

    let m_offset = 0;
    let m_limit = 100;
    let one_record = {};

    list_dir(undefined, undefined, m_offset, m_limit)
        .then(data => {
            data.data.list.forEach(function (root_folder) {
                one_record.root_folder_id = root_folder.id;
                one_record.root_folder_name = root_folder.name;

                list_dir_loop(one_record.root_folder_id, undefined, m_offset, m_limit);

            });
        });
}

async function list_dir_loop(id = -1, folder_id = -1, offset = 0, limit = 100) {
    console.log("in the folder", id);
    list_dir(id, folder_id, offset, limit)
        .then(data => {
            if (data.data.list.length > 0) {
                data.data.list.forEach(function (folder) {
                    //one_record.folder_id = folder.id;
                    //one_record.folder_name = folder.name;
                    console.log("x:", folder);
                    list_dir_loop(folder.id, undefined, offset, limit);
                });
            } else {
                //getting pics
                console.log("getting pics of ", id);
                list_dir(-1, id, offset, limit)
                    .then(photo_data => {
                        photo_data.data.list.forEach(function (photo) {
                            let one_record = {
                                "photo_id": photo.id,
                                "filename": photo.filename,
                                "folder_id": photo.folder_id,
                                "time": photo.time,
                                "type": photo.type,
                                "orientation": photo.additional.orientation,
                                "cache_key": photo.additional.thumbnail.cache_key,
                                "unit_id": photo.additional.thumbnail.unit_id
                            }
                            save_photo(one_record);
                            console.log("pic:", one_record);
                            //list_dir_loop(folder.id, undefined, offset, limit);
                        });
                    });
            }
        });

    loop_count = loop_count + 1;
    console.log("loop_count:", loop_count);

}