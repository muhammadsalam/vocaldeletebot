import TelegramBot from "node-telegram-bot-api";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

console.clear();
console.log("----");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const download = (url, path, callback) => {
    fetch(url)
        .then((res) => {
            const fileStream = fs.createWriteStream(path);
            res.body.pipe(fileStream);
            fileStream.on("close", callback);
        })
        .catch((err) => {
            console.error(`Ошибка при загрузке файла с ${url}:`, err);
        });
};

bot.on("video", async (msg, meta) => {
    try {
        const fileId = msg.video.file_id;
        await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
        )
            .then((res) => res.json())
            .then((data) => {
                const filePath = data.result.file_path;
                const downloadURL = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
                const newFilePath = path.join(
                    __dirname,
                    "videos",
                    `${fileId}.mp4`
                );

                download(downloadURL, path.join(newFilePath), () => {
                    bot.sendMessage(
                        msg.chat.id,
                        "Файл успешно скачан, загрузка началась"
                    );

                    sendFileToVocalremover(newFilePath);
                });
            });
    } catch (err) {
        console.log(err);
        bot.sendMessage(msg.chat.id, "Error: " + err);
    }
});

const getServerId = async () => {
    const response = await fetch(
        "https://api.vocalremover.org/split/get_server",
        {
            method: "GET",
            headers: {
                Origin: "https://vocalremover.org",
            },
        }
    );
    const data = await response.json();
    return data.server;
};

const sendFileToVocalremover = async (filePath) => {
    try {
        const form = new FormData();
        form.append("file", fs.createReadStream(filePath));

        const serverId = await getServerId();

        const response = await fetch(
            `https://api${serverId}.vocalremover.org/split/tracks`,
            {
                headers: {
                    accept: "application/json, text/plain, */*",
                    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "cache-control": "no-cache",
                    "content-type":
                        "multipart/form-data; boundary=----WebKitFormBoundaryOZZjmFTYxFH5USY7",
                    pragma: "no-cache",
                    "sec-ch-ua":
                        '"Opera GX";v="109", "Not:A-Brand";v="8", "Chromium";v="123"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                    Referer: "https://vocalremover.org/",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.1234.45 Safari/537.36 OPR/99.0.4786.18",
                },
                body: form,
                method: "POST",
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(responseData);
    } catch (err) {
        console.error(
            "Ошибка при отправке файла на сервер Vocal Remover:",
            err
        );
    }
};

sendFileToVocalremover(
    path.join(
        __dirname,
        "videos",
        "BAACAgIAAxkBAAPcZoAq-f5NjzzHEzchrSEFRhLgnwwAAsVEAAK6hfhK_Pfl5b_v7XM1BA.mp4"
    )
);
