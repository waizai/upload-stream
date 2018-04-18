/*
* @Author: dangxiaoli
* @Date:   2018-04-17 20:10:33
* @Last Modified by:   dangxiaoli
* @Last Modified time: 2018-04-18 17:15:54
*/
class BufferCache {
    constructor(cutSize = 2097152){
        //Allocates a new Buffer of size bytes
        this._cache = Buffer.alloc(0);
        this.cutSize = cutSize;
        //cache list
        this.readyCache = [];
    }

    // 放入不同大小的buffer
    pushBuf(buf){
        let cacheLength = this._cache.length;
        let bufLength = buf.length;

        this._cache = Buffer.concat([this._cache, buf], cacheLength + bufLength);

        this.cut();
    }

    //切分成等份的
    cut(){
        if(this._cache.length >= this.cutSize){
            let totalLen = this._cache.length;
            let cutCount = Math.floor(totalLen / this.cutSize);

            for(let i = 0; i < cutCount; i++){
                let newBuf = Buffer.alloc(this.cutSize);
                this._cache.copy(newBuf, 0, i * this.cutSize, (i + 1) * this.cutSize);
                this.readyCache.push(newBuf);
            }

            this._cache = this._cache.slice(cutCount * this.cutSize);
        }
    }

    getChunks(){
        return this.readyCache;
    }

    //获取数据包的最后一小节
    getRemainChunks(){
        if(this._cache.length <= this.cutSize){
            return this._cache;
        }else{
            this.cut();
            return this.getRemainChunks();
        }
    }
}


module.exports = BufferCache;
