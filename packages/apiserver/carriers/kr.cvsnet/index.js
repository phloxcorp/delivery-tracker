const axios = require('axios');
const { JSDOM } = require('jsdom');

const STATUS_MAP = {
  0: { id: 'information_received', text: '방문예정' },
  1: { id: 'at_pickup', text: '상품인수' },
  2: { id: 'in_transit', text: '이동중' },
  3: { id: 'out_for_delivery', text: '배송출발' },
  4: { id: 'delivered', text: '배송완료' },
};

const STR_TO_STATUS = {
  집화처리: 1,
  배달출발: 3,
  배달완료: 4,
};

const notFoundError = {
  code: 404,
  message: '해당 운송장의 배송정보를 조회할 수 없습니다.',
};

function toKST(str) {
  return `${str}+09:00`;
}

function toStatus(str) {
  const statusIdx = STR_TO_STATUS[str];
  if (statusIdx === undefined) {
    return STATUS_MAP[2];
  }
  return STATUS_MAP[statusIdx];
}

function getTrack(trackId) {
  return new Promise((resolve, reject) => {
    axios
      .get('https://www.cvsnet.co.kr/invoice/tracking.do', {
        params: {
          invoice_no: trackId,
        },
      })
      .then(res => {
        const dom = new JSDOM(res.data);
        const { document } = dom.window;

        const script = document.querySelector('script:not([type]');
        if (!script || !script.text) {
          reject(notFoundError);
        }
        const matches = script.text.match(/var trackingInfo = ({.+});/);
        if (matches.length !== 2) {
          reject(notFoundError);
        }
        const trackingInfo = JSON.parse(matches[1]);
        if (trackingInfo.code !== 200) {
          reject({
            code: trackingInfo.code,
            message: trackingInfo.msg,
          });
        }

        resolve({
          from: {
            name: trackingInfo.sender.name,
            time: null,
          },
          to: {
            name: trackingInfo.receiver.name,
            time: null,
          },
          state: toStatus(trackingInfo.latestTrackingDetail.transKind),
          progresses: trackingInfo.trackingDetails.map(detail => {
            return {
              time: toKST(detail.transTime),
              location: { name: detail.transWhere },
              status: toStatus(detail.transKind),
              description: detail.transKind,
            };
          }),
        });
      })
      .catch(err => reject(err));
  });
}

module.exports = {
  info: {
    name: 'GS Postbox 택배',
    tel: '+8215771287',
  },
  getTrack,
};

// getTrack('363714939373')
//   .then(res => console.log(JSON.stringify(res, null, 2)))
//   .catch(err => console.error(err));
