function getChunks(stream){
    var raw = [];
    return new Promise(resolve => 
        stream.on('data', data => 
            raw.push(data)
        ).on('end', () =>
            raw.length ? resolve(Buffer.concat(raw)) : resolve(null)
        )
    );
};