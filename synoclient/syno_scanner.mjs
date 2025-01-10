import { list_dir } from "./synoclient.mjs"

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

                list_dir_loop(one_record.root_folder_id, undefined, m_offset, m_limit)
                    .then(data => {
                        console.log(data);
                    });

            });
        });
}

async function list_dir_loop(id = -1, folder_id = -1, offset = 0, limit = 100) {

    if (n <= 0) {
        return;
    }
    list_dir(id, folder_id, offset, limit)
        .then(data => {
            data.data.list.forEach(function (folder) {
                one_record.folder_id = folder.id;
                one_record.folder_name = folder.name;
                console.log(one_record);
            });
        });

    loop_count = loop_count + 1;
    console.log("loop_count:", loop_count);

}