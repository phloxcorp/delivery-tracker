const axios = require('axios');

function parseStatus(s) {
  if (s.includes('집하완료')) return { id: 'at_pickup', text: '상품인수' };
  if (s.includes('배송출발'))
    return { id: 'out_for_delivery', text: '배송출발' };
  if (s.includes('배송완료')) return { id: 'delivered', text: '배송완료' };
  return { id: 'in_transit', text: '이동중' };
}

function getTrack(trackId) {
  return new Promise((resolve, reject) => {
    axios
      .get(`https://tms.api.kurly.com/tms/v1/delivery/invoices/${trackId}`)
      .then(res => {
        if (!res.data.data) {
          return reject({
            code: 404,
            message: '잘못된 운송장 번호입니다.',
          });
        }
        return res.data.data.trace_infos;
      })
      .then(progressTable => {
        const shippingInformation = {
          from: {
            name: '***',
            time: null,
          },
          to: {
            name: '***',
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
          progresses.unshift({
            time: `${element.date_time}+09:00`,
            location: {
              name: element.location,
            },
            status: parseStatus(element.status),
            description: element.status,
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
    name: '마켓컬리',
    tel: '+18333165',
  },
  getTrack,
};

// getTrack('225-I0-2278711430054-0001')
//   .then(r => console.log(JSON.stringify(r, null, 2)))
//   .catch(err => console.log(err));
