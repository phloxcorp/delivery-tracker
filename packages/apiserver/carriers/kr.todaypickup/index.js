const axios = require('axios');
const { JSDOM } = require('jsdom');

function parseStatus(s) {
  if (s.includes('상품이 수거')) return { id: 'at_pickup', text: '상품인수' };
  if (s.includes('상품이 배송 중'))
    return { id: 'out_for_delivery', text: '배송출발' };
  if (s.includes('소중한 상품이 안전하게 도착'))
    return { id: 'delivered', text: '배송완료' };
  if (s.includes('상품이 접수'))
    return { id: 'information_received', text: '방문예정' };
  return { id: 'in_transit', text: '이동중' };
}

function getTrack(trackId) {
  return new Promise((resolve, reject) => {
    axios
      .get(`https://mall.todaypickup.com/front/delivery/list/${trackId}`)
      .then(res => {
        const dom = new JSDOM(res.data);
        const { document } = dom.window;
        const itemName = document.querySelector(
          'section table > tbody > tr:nth-child(2) > td'
        );
        const userName = document.querySelector(
          'section table > tbody > tr:nth-child(3) > td'
        );
        const progresses = document.querySelectorAll('section table > tbody');
        if (
          !itemName ||
          itemName.textContent.trim() === '배송정보가 없습니다.' ||
          !userName ||
          progresses.length !== 3
        ) {
          return reject({
            code: 404,
            message: '배송정보가 없습니다',
          });
        }
        return {
          userName: userName.textContent.trim(),
          progressTable: progresses[2].querySelectorAll('tr'),
        };
      })
      .then(({ userName, progressTable }) => {
        const shippingInformation = {
          from: {
            name: '***',
            time: null,
          },
          to: {
            name: userName,
            time: null,
          },
          state: {
            id: 'information_received',
            text: '방문예정',
          },
          progresses: [],
        };

        const { progresses } = shippingInformation;

        progressTable.forEach(element => {
          const dateTime = element
            .querySelector('td:first-child')
            .textContent.trim()
            .replace('  ', 'T');
          const status = element
            .querySelector('td:last-child')
            .textContent.trim();
          progresses.unshift({
            time: `${dateTime}+09:00`,
            status: parseStatus(status),
            description: status.split('\n')[0],
          });
        });

        if (progresses.length > 0) {
          shippingInformation.from.time =
            progresses[progresses.length - 1].time;
          shippingInformation.state = progresses[0].status;
          if (shippingInformation.state.id === 'delivered')
            shippingInformation.to.time = progresses[0].time;
        }

        resolve(shippingInformation);
      })
      .catch(err => reject(err));
  });
}

module.exports = {
  info: {
    name: '오늘의픽업',
    tel: '+16665615',
  },
  getTrack,
};

getTrack('090154361903')
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(err => console.log(err));
