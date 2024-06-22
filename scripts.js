// scripts.js

// 將輸入的字母轉換為大寫，並過濾非數字和非英文字母的字符
document.getElementById('routeInput').addEventListener('input', function (event) {
    const input = this.value;
    const filteredInput = input.replace(/[^a-zA-Z0-9]/g, ''); // 過濾非數字和非英文字母的字符, regular expression (/[^a-zA-Z0-9]/g)
    this.value = filteredInput.toUpperCase(); // 將輸入的值轉換為大寫
});

const loading = document.getElementById('loading');
const stationList = document.querySelector('.station-list');
const popupContainer = document.querySelector('.popup-container');
let stopData;

// 在按下回車鍵時觸發查詢
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        queryBusRoute();
    }
}

// 查詢路線的function
async function queryBusRoute() {
    const route = document.getElementById('routeInput').value.trim();
    if (!route) {
        alert("請輸入巴士路線號碼");
        return;
    }

    // 等待較長出現loading icon的function
    let loadingTimeout = setTimeout(() => {
        loading.style.display = 'flex';
    }, 300); // 0.3秒後顯示loading動畫

    try {
        const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route/`);
        loading.style.display = 'none';
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        displayResults(data.data); // 確保直接使用data來處理API返回的數據
    } catch (error) {
        console.error('Fetch error: ', error);
        alert('查詢過程中出錯，請稍後重試。');
    } finally {
        clearTimeout(loadingTimeout);
        loading.style.display = 'none';
    }
}

// 出現查找結果的function
function displayResults(routes) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (!routes || routes.length === 0) {
        resultsDiv.innerHTML = '<p>沒有找到相關路線信息。</p>';
        return;
    }

    let routeAppearrance = false;

    const busStopFather = document.querySelector('.busStopFather');
    const busStop = document.querySelector('.busStop');
    const searchSection = document.querySelector('.searchSection')

    routes.forEach(route => {
        const inputRouteNumber = document.getElementById('routeInput').value.trim();

        if (route.route === inputRouteNumber) {
            if (routeAppearrance === false) {
                resultsDiv.innerHTML = '<p>請選擇路線：</p>';
                routeAppearrance = true
            }
            const routeDiv = document.createElement('div');
            routeDiv.classList.add('route');

            const routeInfo = `
                <h3>路線：${route.route}</h3>
                <p>起點：${route.orig_tc}</p>
                <p>終點：${route.dest_tc}</p>
            `;

            routeDiv.innerHTML = routeInfo;
            resultsDiv.appendChild(routeDiv);

            routeDiv.onclick = async function showRouteDetails() {
                busStop.classList.remove('hiddenBusStop');
                resultsDiv.classList.add('hiddenResults');
                searchSection.classList.add('searchSectionHidden');
                busStopFather.style.display = 'flex';
                // API route.route, route.bound, route.service_type

                // 等待較長出現loading icon的function
                let loadingTimeout = setTimeout(() => {
                    loading.style.display = 'flex';
                }, 300); // 0.3秒後顯示loading動畫

                try {
                    const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route.route}/${route.bound === "O" ? "outbound" : "inbound"}/${route.service_type}`);
                    let responseStop;
                    if (!stopData) {
                        responseStop = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/stop');
                    }
                    loading.style.display = 'none';
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    const data = await response.json();
                    if (!stopData) {
                        if (!responseStop.ok) {
                            throw new Error('Network response was not ok');
                        }
                        stopData = (await responseStop.json()).data;
                    }
                    displayResultsStop(data.data);
                } catch (error) {
                    console.error('Fetch error: ', error);
                    alert('查詢過程中出錯，請稍後重試。');
                } finally {
                    clearTimeout(loadingTimeout);
                    loading.style.display = 'none';
                }
            };
        }
    });

    const backButton = document.querySelector('.backButton');
    backButton.onclick = function backToResults() {
        busStop.classList.add('hiddenBusStop');
        resultsDiv.classList.remove('hiddenResults');
        searchSection.classList.remove('searchSectionHidden');
        busStopFather.style.display = 'none';
        stationList.innerHTML = "";
    }

    if (resultsDiv.childElementCount === 0) {
        resultsDiv.innerHTML = '<p>沒有找到相關路線信息。</p>';
    }
}

function displayResultsStop(stops) {
    stationList.innerHTML = "";
    stops.forEach(stop => {
        const item = document.createElement('li');
        const busStopName = stopData.find(value => value.stop === stop.stop).name_tc;
        item.innerHTML = `<span class="number">${stop.seq}</span> ${busStopName}`
        stationList.appendChild(item)

        item.onclick = async function () {
            // 等待較長出現loading icon的function
            let loadingTimeout = setTimeout(() => {
                loading.style.display = 'flex';
            }, 300); // 0.3秒後顯示loading動畫
            try {
                const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop.stop}/${stop.route}/${stop.service_type}`);
                loading.style.display = 'none';
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                displayResultsEta(busStopName, data.data.filter(value => value.dir === stop.bound)); // 確保直接使用data來處理API返回的數據
            } catch (error) {
                console.error('Fetch error: ', error);
                alert('查詢過程中出錯，請稍後重試。');
            } finally {
                clearTimeout(loadingTimeout);
                loading.style.display = 'none';
            }
        }
    });
}

function displayResultsEta(busStopName, eta) {
    popupContainer.innerHTML = `<div class="popup-header">${busStopName}</div><div class="popup-close" onclick="closePopup()"><i class="fas fa-times"></i></div>`

    eta.forEach(e => {
        const isRealTime = e.rmk_tc.length === 0;
        const popupTimeItem = document.createElement('div');
        popupTimeItem.classList.add("popup-time-item")
        popupTimeItem.innerHTML = `<div class="popup-time"><i class="fas fa-bus ${isRealTime ? "popup-icon-red" : "popup-icon-grey"}"></i>${extractTime(e.eta)}</div>
        <div class="popup-status ${isRealTime ? "real-time" : "scheduled"}">${isRealTime ? "實時班次" : e.rmk_tc}</div>`
        popupContainer.appendChild(popupTimeItem);
    });

    popupContainer.classList.remove("hidden-popup-container");
}

function extractTime(timestamp) {
    // Create a new Date object from the timestamp
    const date = new Date(timestamp);

    // Get hours and minutes
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Format hours and minutes to always be two digits
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    // Return the formatted time
    return `${formattedHours}:${formattedMinutes}`;
}

function closePopup() {
    
    popupContainer.classList.add("hidden-popup-container");
}