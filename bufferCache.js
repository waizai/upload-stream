/*
* @Author: dangxiaoli
* @Date:   2018-04-17 20:10:33
* @Last Modified by:   dangxiaoli
* @Last Modified time: 2018-04-17 20:23:22
*/
class BufferCache {
    constructor(cutSize = 2097152){
        //Allocates a new Buffer of size bytes
        this._cache = Buffer.alloc(0);
        this.cutSize = cutSize;

        this.readyCache = [];
    }
}
