const fs = require('fs');
const config = require('./config.json');
const fastify = require('fastify')({
    ignoreTrailingSlash: true,
    https: config.ssl ? { 
        cert: fs.readFileSync('./ssl.cert', 'utf-8'),
        key: fs.readFileSync('./ssl.key', 'utf-8'),
    } : false,
});
const Corrosion = require('corrosion');
const https = require('https');
const corrosion = new Corrosion({
    prefix: config.prefix || '/service/',
    codec: config.codec || 'xor',
    requestMiddleware: [
        Corrosion.middleware.blacklist((config.blacklist || [])),
        Corrosion.middleware.address((config.addresses || [])),
    ]
});
const path = require('path');
const routes = [
    [ '/gs/', 'gs', path.join(__dirname, 'pages', 'gs.html'), str => str.replace('$gs', buildGames(require('./gs.json'))) ],
    [ '/privacy/', 'privacy', path.join(__dirname, 'pages', 'privacy.html') ],
    [ '/settings/', 'settings', path.join(__dirname, 'pages', 'settings.html') ],
    [ '/support/', 'faq', path.join(__dirname, 'pages', 'support.html') ],
    [ '/', 'home', path.join(__dirname, 'pages', 'index.html') ],
];
const base64 = {
    encode(val){
        if (typeof val != 'string') return val;
        return Buffer.from(val).toString('base64');
    },
    decode(val){
        if (typeof val != 'string') return val;
        return Buffer.from(val, 'base64').toString('utf-8');
    },
};
const engines = {
    google: 'https://www.google.com/search?q=',
    youtube: 'https://www.youtube.com/results?search_query=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
    twitter: 'https://twitter.com/search?q=',
    reddit: 'https://www.reddit.com/search/?q=',
};

fastify.register(require('fastify-cookie'));
fastify.register(require('fastify-formbody'));

routes.forEach(([path, id, filePath, fn]) => 
    fastify.get(path, (request, reply) => 
        reply.type('html').send(render({
            main: fn ? fn(fs.readFileSync(filePath, 'utf-8')) : fs.readFileSync(filePath, 'utf-8'),
            theme: request.cookies['appearance'] || (config.appearance || 'bright'),
            engine: request.cookies['engine'] || (config.engine || 'google'),
            id,
        }))
    )
);
fastify.get('/gateway/', (request, reply) => gateway(request, reply, base64.decode((request.query.url || ''))));
fastify.post('/gateway/', (request, reply) => gateway(request, reply, typeof request.body == 'object' ? request.body.url : request.body));

fastify.post('/suggestions/', (request, reply) => {
    const val = typeof request.body == 'object' ? request.body.q : request.body;
    try {
        https.request(`https://duckduckgo.com/ac/?q=${encodeURIComponent(val)}`, {}, async resp => {
            const send = await getChunks(resp);
            reply.code(200).type('application/json').send(send);
        }).end();
    } catch(err) {
        reply.code(500).type('application/json').send(`{ "error": "${err.toString()}", }`);
    };
});

if (config.proxy) {
    fastify.register(require('fastify-express')).then(() => {
        fastify.use((req, res, next) => {
            if (req.url.startsWith(corrosion.prefix)) { 
                if (config.authorization && req.headers.cookie) {
                    const cookies = parseCookies(req.headers.cookie);
                    if (!cookies.has(config.authorization.name) || cookies.get(config.authorization.name) != config.authorization.value) {
                        res.status(401);
                        return res.send('');
                    };
                };
                corrosion.request(req, res);
            } else next();
        });
    });
    fastify.server.on('upgrade', corrosion.upgrade);
};

fastify.register(require('fastify-static'), {
    root: __dirname + '/static',
    prefix: '/',
});

fastify.listen((process.env.PORT || config.port), '0.0.0.0', (err, address) => {
    if (err) {
        throw err;
    } else {
        console.log(`Incognito running on ${address}`)
    };
});

function render(data = {}) {
    return fs.readFileSync('./template.html', 'utf8').replace(/\$(theme|engine|main|head|bottom|id)/g, str => 
        data[str.slice(1)] || ''
    );
};

function gateway(request, reply, val) {
    const url = isUrl(val) ? (new URL(/^http(s?):\/\//.test(val) ? val : 'http://' + val).href) : `${engines[(request.cookies.engine || config.engine)] || engines.google}${val}`;
    if (config.authorization) reply.header('Set-Cookie', `${config.authorization.name}=${config.authorization.value}; Domain=${request.headers.host};`);
    reply.header('Location', rewriteUrl(url));
    reply.status(301);
    reply.send('');
};

function buildGames(json = []) {
    let html = '';
    for ( let i = 0; i < json.length; i ++ ) {
        let { image, location, title } = json[i];
        html += `<a class="thumbnail" href="${location}"><img src="/src/gs/thumbnails/${image}"><div class="title">${title}</div></a>`;
    };  
    return html
};

function isUrl(val = ''){
    if (/^http(s?):\/\//.test(val) || val.includes('.') && val.substr(0, 1) != ' ') return true;
    return false;
};

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

function parseCookies(str = '') {
    const map = new Map();
    str.split('; ').forEach(cookie => map.set(...cookie.split('=')));
    return map;
};

function rewriteUrl(str = '', origin = '') {
    return origin + corrosion.prefix + corrosion.codec.encode(str); 
};
