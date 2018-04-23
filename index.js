/*
* @Author: dangxiaoli
* @Date:   2018-04-17 19:52:02
* @Last Modified by:   dangxiaoli
* @Last Modified time: 2018-04-23 19:08:29
*/
let request = require('request');
let fs = require('fs');
let BufferCache = require('./bufferCache');
const chunkSplice = 2097152; // 2MB
let bufferCache = new BufferCache(chunkSplice);
let isFinished = false;
let RETRY_COUNT = 5;

//获取下载内容
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

//onstart说明下载已经开始了，可以获取分片了
function onStart(headers){
    console.log(`start downloading, headers is :${headers}`);
    sendChunks();
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
    let stopSend = false;


    function send(options){
        let readyCache = options.readyCache;
        let fresh = options.fresh;
        let retryCount = options.retry;
        let chunkIndex;
        let chunk = null;

        if(fresh){
            if(readyCache.length === 0){
                return;
            }
            chunk = readyCache.shift();
            chunkIndex = chunkId;
            chunkId++;
        }else{
            chunk = options.data;
            chunkIndex = options.index;
        }
        sending++;

        let sendP = upload('http://localhost:3000',{
            chunk: {
                value: chunk,
                options: {
                    filename: `example.mp4_IDSPLIT_${chunkId}`
                }
            }
        })
        sendP.then((response) => {
            sending--;
            let json = JSON.parse(response);
            if(json.errno === 0 && readyCache.length > 0){
                //成功上传，继续递归
                return send({
                    retry: RETRY_COUNT,
                    fresh: true,
                    readyCache: readyCache
                });
            }
            return Promise.solve(json);
        }).catch(err => {
            if(retryCount > 0){
                return send({
                    retry: retryCount - 1,
                    index: chunkIndex,
                    fresh: false,
                    data: chunk,
                    readyCache: readyCache
                });
            }else{
                console.log(`upload failed of chunkIndex: ${chunkIndex}`);
                stopSend = true;
                return Promise.reject(err);
            }
        })
        chunkId++;


    }

    return new Promise((resolve, reject) => {
        let readyCache = bufferCache.getChunks();
        let threadPool = [];

        let sendTimer = setInterval(() => {
            if(sending < MAX_SENDING && readyCache.length > 0){
                //同时开启4个分片上传
                for(let i = 0; i < MAX_SENDING; i++){
                    let thread = send({
                        retry: RETRY_COUNT,
                        fresh: true,
                        readyCache: readyCache
                    });
                    threadPool.push(thread);
                }
            }else if(isFinished && readyCache.length === 0 || stopSend){
                clearInterval(sendTimer);

                if (!stopSend) {
                    let lastChunk = bufferCache.getRemainChunks();
                    readyCache.push(lastChunk);
                    threadPool.push(send({
                        retry: RETRY_COUNT,
                        fresh: true,
                        readyCache: readyCache
                    }));
                }
                Promise.all(threadPool).then(() => {
                    console.log('send success');
                }).catch(err => {
                    console.log('send failed');
                });
            }
        },200);
    })
}


