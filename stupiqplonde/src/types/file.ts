import { convertFileSrc } from "@tauri-apps/api/core";

export function getFileUrl(
    path: string
){
    return convertFileSrc(
        path
    );
}

// было C:/documents/Proj/stupiqplonde/attachments/image.png
// Теперь: asset: //localhost/Proj/stupiqplonde/attachments/image.png