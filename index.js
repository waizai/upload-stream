/*
* @Author: dangxiaoli
* @Date:   2018-04-17 19:52:02
* @Last Modified by:   dangxiaoli
* @Last Modified time: 2018-04-19 14:17:51
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
    let readyCache = bufferCache.getChunks();

    let sendTimer = setInterval(() => {
        if(readyCache.length > 0){
            let receivedChunk = readyCache.shift();
            console.log(`received Chunk ${receivedChunk}`);
        }else if(){
            clearTimeout(sendTimer);
            console.log(`got last chunk`);
            let lastChunk = bufferCache.getRemainChunks();
            console.log(`the last chunk${lastChunk}`);
        }
    },200)
}

function onData(chunk, downloadedLength){
    console.log(`write${chunk.length}KB into cache`);
    bufferCache.pushBuf(chunk);
}

function onFinished(totalLength){
    let chunkCount = Math.ceil(totalLength / chunkSplice);
    console.log('total chunk count is:' + chunkCount);
}


getChunks('https://baobao-3d.bj.bcebos.com/16-0-205.shuimian.mp4', onStart, onData, onFinished);


//上传
function upload(url, data){
    return new Promise((resolve, reject) => {
        request({
            url: url,
            fromData: data
        },function(err, response, body){
            if(!err && response.statusCode === 200){
                resolve(body);
            }else{
                reject(err);
            }
        });
    })
}


function sendChunks(){
    let chunkId = 0;        //给每个分片划分ID
    let sending = 0;        //当前并行上传的数量
    let MAX_SENDING = 1;    //最大并行上传数

    function send(readyCache){
        if(readyCache.length === 0){
            return;
        }

        let chunk = readyCache.shift();
        let sendP = upload('http://localhost:3000',{
            chunk: {
                value: chunk,
                options: {
                    filename: `example.mp4_IDSPLIT_${chunkId}`
                }
            }
        })
    }
}



