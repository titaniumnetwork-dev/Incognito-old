const cookies = navigator.cookieEnabled ? parseCookies(document.cookie) : new Map();
const appearance = cookies.get('appearance') || 'midnight';
const xor = {
    encode(str){
        if (!str) return str;
        return encodeURIComponent(str.toString().split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char).join(''));
    },
    decode(str){
        if (!str) return str;
        return decodeURIComponent(str).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char).join('');
    },
};

Object.defineProperty(document, 'appearance', {
    get() {
        return document.body.getAttribute('data-appearance');
    },
    set(val) {
        return document.body.setAttribute('data-appearance', val);
    },
});

Object.defineProperty(document, 'engine', {
    get() {
        return document.body.getAttribute('data-engine');
    },
    set(val) {
        return document.body.setAttribute('data-engine', val);
    },
});

Object.defineProperty(document, 'page', {
    get() {
        return document.body.getAttribute('data-page');
    },
});

if (localStorage.getItem('__tab_title')) {
    try {
        document.title = atob(decodeURIComponent(localStorage.getItem('__tab_title')));
    } catch(err) {
        console.error('Could not decode storage property "__tab_title" due to invalid codec.');
    };
};

if (localStorage.getItem('__tab_icon')) {
    try {
        document.querySelector('#favicon').href = atob(decodeURIComponent(localStorage.getItem('__tab_icon')));;
    } catch(err) {
        console.error('Could not decode storage property "__tab_icon" due to invalid codec.');
    };
};

switch(document.page) {
    case 'settings':
        settings();
        break;
    case 'gs':
        gs();
        break;
    case 'home':
        home();
};

function settings() {
    appearance();
    engine();
    tab();
    function tab() {
        const input = document.querySelector('.tab input');
        document.querySelector('.tab button[data-action=title]').addEventListener('click', () => {
            if (!input.value) return false;
            changeTitle(input.value);
        });
        document.querySelector('.tab button[data-action=icon]').addEventListener('click', () => {
            if (!input.value) return false;
            changeFavicon(input.value);
        });
    };
    function appearance() {
        let lastSelected = document.querySelector(`.appearance .options li[data-appearance=${document.appearance}]`);
        document.querySelectorAll('.appearance .options li').forEach(node => 
            node.addEventListener('click', () => {
                lastSelected.removeAttribute('data-selected');
                document.appearance = node.getAttribute('data-appearance') || 'midnight';
                node.setAttribute('data-selected', '')
                lastSelected = node;
                document.cookie = `appearance=${document.appearance}`;
            })
        );
        if (lastSelected) lastSelected.setAttribute('data-selected', '');
    };
    function engine() {
        let lastSelected = document.querySelector(`.search-engine .options li[data-engine=${document.engine}]`);
        document.querySelectorAll('.search-engine .options li').forEach(node => {
            node.addEventListener('click', () => {
                lastSelected.removeAttribute('data-selected');
                node.setAttribute('data-selected', '')
                lastSelected = node;
                document.cookie = `engine=${node.getAttribute('data-engine')}`;
            });
        })
        if (lastSelected) lastSelected.setAttribute('data-selected', '');
    };
};

function gs() {
    thumbnails();
    search();
    frameControls();
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            document.querySelector('.frame .controls button[data-action=fullscreen]').innerHTML = 'fullscreen_exit';
        } else {
            document.querySelector('.frame .controls button[data-action=fullscreen]').innerHTML = 'fullscreen';
        };
    });
    function frameControls() {
        document.querySelector('.frame .controls button[data-action=close]').addEventListener('click', () => 
            closeFrame('gs')
        );
        document.querySelector('.frame .controls button[data-action=fullscreen]').addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.querySelector('.frame').requestFullscreen();
            };
        });
    }
    function search() {
        document.querySelector('.gs-search').addEventListener('keyup', function() {
            let matches = 0;
            document.querySelectorAll('.thumbnail').forEach(entry => {
                const title = entry.querySelector('.title').textContent;
                if (!title.trim().toLowerCase().includes(this.value.trim().toLowerCase())) {
                    entry.style.display = 'none';
                } else {
                    matches += 1;
                    entry.style.removeProperty('display');
                };
            });
            if (!matches) {
                document.querySelector('.gs-empty').style.display = 'block';
            } else {
                document.querySelector('.gs-empty').style.removeProperty('display'); 
            };
        });
    };
    function thumbnails() {
        document.querySelectorAll('.thumbnail').forEach(node => {
            node.addEventListener('click', e => {
                e.preventDefault();
                renderFrame('gs', node.href)
            });
        });
    };
};

async function home() {
    const form = document.querySelector('.service');
    submit();
    quickLinks();
    suggestions();
    function submit() {
        form.addEventListener('submit', e => {
            e.preventDefault();
            renderFrame('web', `./gateway?url=${encodeURIComponent(btoa(form.querySelector('input').value))}`);
        });
    };
    function quickLinks() {
        document.querySelectorAll('.quick-button').forEach(node => 
            node.addEventListener('click', e => {
                e.preventDefault();
                renderFrame('web', node.href);
            })   
        )
    };
    function suggestions() {
        const suggestions = document.querySelector('#suggestions');
        form.querySelector('input').addEventListener('input', async () => {
            suggestions.innerHTML = '';
            const res = await fetch('./suggestions/', {
                method: 'POST',
                body: form.querySelector('input').value,
            });
            const json = await res.json();
            if (json.length) {
                json.forEach(entry => {
                    const option = document.createElement('option');
                    option.value = entry.phrase;
                    suggestions.appendChild(option);
                });
            } else {
                suggestions.innerHTML = `
                <option value="discord.com"></option>
                <option value="youtube.com"></option>
                <option value="twitch.tv"></option>
                <option value="twitter.com/explore"></option>
                <option value="reddit.com"></option>
                `;
            }
        });
    };
};

function renderFrame(id = '', url) {
    if (!document.querySelector(`.frame[data-service=${id}]`)) return false;
    const frame = document.querySelector(`.frame[data-service=${id}]`);
    document.querySelector('main').style.display = "none";
    frame.querySelector('iframe').src = url;
    frame.style.display = 'block';
};

function closeFrame(id = '') {
    if (!document.querySelector(`.frame[data-service=${id}]`)) return false;
    const frame = document.querySelector(`.frame[data-service=${id}]`);
    document.querySelector('main').style.removeProperty('display');
    frame.querySelector('iframe').src = 'about:blank';
    frame.style.removeProperty('display');
    if (document.fullscreenElement) document.exitFullscreen();
};

function changeTitle(val = '') {
    document.title = val;
    return localStorage.setItem('__tab_title', encodeURIComponent(btoa(val)));
};  

function changeFavicon(val) {
    const uri = new URL(/^http(s?):\/\//.test(val) ? val : 'http://' + val);
    document.querySelector('#favicon').href = uri.href;
    return localStorage.setItem('__tab_icon', encodeURIComponent(btoa(uri.href)));
};  

function parseCookies(str = '') {
    const map = new Map();
    str.split('; ').forEach(cookie => map.set(...cookie.split('=')));
    return map;
};