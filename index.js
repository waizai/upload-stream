/*
* @Author: dangxiaoli
* @Date:   2018-04-17 19:52:02
* @Last Modified by:   dangxiaoli
* @Last Modified time: 2018-04-18 18:04:12
*/
let request = require('request');
let fs = require('fs');
let BufferCache = require('./bufferCache');
const chunkSplice = 2097152; // 2MB
let bufferCache = new BufferCache(chunkSplice);


function getChunks(url, onStartDownload, onDownloading, onDownloadClose){
    let totalLength = 0;

    let httpStream = request({
        method: 'GET',
        url: url
    });

    let writeStream = fs.createWriteStream('/dev/null');

    httpStream.pipe(writeStream);

    httpStream.on('response',(response) => {
        onStartDownload(response.headers)
    }).on('data',(chunk) => {
        totalLength += chunk.length;
        console.log(`${totalLength} : ${chunk}`);
        onDownloading(chunk, totalLength);
    });

    httpStream.on('close',() => {
        console.log('download finished');
        onDownloadClose(totalLength);
    });

}

function onStart(headers){
    console.log(`start downloading, headers is :${headers}`);
}

function onData(chunk, downloadedLength){
    console.log(`write${chunk.length}KB into cache`);
    bufferCache.pushBuf(chunk);
}

function onFinished(totalLength){
    let chunkCount = Math.ceil()
}










