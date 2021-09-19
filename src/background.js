import axios from "axios";
import holidays from "./holidays";

var Interval;
var holiday;
var RealtimeFundcode = null;
var RealtimeIndcode = null;
var fundListM = [];
var seciList = [];
var showBadge = 1;
var BadgeContent = 1;
var BadgeType = 1;
var userId = null;

var socket = null;
var wsUrl = "wss://api-aws.huobi.pro/ws";
var coinListM = [];
var dataPool = {};



var getGuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (
    c
  ) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
var getHoliday = () => {
  // let url = "http://x2rr.github.io/funds/holiday.json";
  // return axios.get(url);

  return new Promise(function(resolve, reject) {
    resolve(holidays);
  });

  // return holidays;
};
var checkHoliday = date => {
  var nowMonth = date.getMonth() + 1;
  var nowYear = date.getFullYear();
  var strDate = date.getDate();
  if (nowMonth >= 1 && nowMonth <= 9) {
    nowMonth = "0" + nowMonth;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }

  let check = false;
  var nowDate = nowMonth + "-" + strDate;
  let holidayList = holiday.data;
  for (const year in holidayList) {
    if (holidayList.hasOwnProperty(year)) {
      const yearData = holidayList[year];
      if (year == nowYear) {
        for (const day in yearData) {
          if (yearData.hasOwnProperty(day)) {
            const dayData = yearData[day];
            if (nowDate == day && dayData.holiday) {
              check = true;
            }
          }
        }
      }
    }
  }
  return check;
};

var toNum = a => {
  var a = a.toString();
  var c = a.split(".");
  var num_place = ["", "0", "00", "000", "0000"],
    r = num_place.reverse();
  for (var i = 0; i < c.length; i++) {
    var len = c[i].length;
    c[i] = r[len] + c[i];
  }
  var res = c.join("");
  return res;
};

var cpr_version = (a, b) => {
  var _a = toNum(a),
    _b = toNum(b);
  if (_a == _b) console.log("版本号相同！版本号为：" + a);
  if (_a > _b) console.log("版本号" + a + "是新版本！");
  if (_a < _b) console.log("版本号" + b + "是新版本！");
};

var formatNum = val => {
  let num = parseFloat(val);
  let absNum = Math.abs(num);
  if (absNum < 10) {
    return num.toFixed(2);
  } else if (absNum < 100) {
    return num.toFixed(1);
  } else if (absNum < 1000) {
    return num.toFixed(0);
  } else if (absNum < 10000) {
    return (num / 1000).toFixed(1) + 'k';
  } else if (absNum < 1000000) {
    return (num / 1000).toFixed(0) + 'k';
  } else if (absNum < 10000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else {
    return (num / 1000000).toFixed(0) + 'M';
  }
}

var setBadge = (fundcode, Realtime, type) => {
  let fundStr = null;
  if (type == 3) {
    //单个指数
    // let url =
    //   "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f3&secids=" +
    //   fundcode +
    //   "&_=" +
    //   new Date().getTime();
    // axios.get(url).then((res) => {
    //   let data = res.data.data.diff;
    //   let text = data[0].f3.toString();
    //   let num = data[0].f3;
    //   chrome.browserAction.setBadgeText({
    //     text: text
    //   });
    //   let color = Realtime ?
    //     num >= 0 ?
    //     "#F56C6C" :
    //     "#4eb61b" :
    //     "#4285f4";
    //   chrome.browserAction.setBadgeBackgroundColor({
    //     color: color
    //   });
    // });
      let data = dataPool[RealtimeIndcode];
      let text = data.close;
      let num = data.close - data.open;
      chrome.browserAction.setBadgeText({
        text: text
      });
      let color = 
        num >= 0 ?
        "#F56C6C" :
        "#4eb61b";
      chrome.browserAction.setBadgeBackgroundColor({
        color: color
      });
  } else {
    if (type == 1) {
      //单个代币
      fundStr = fundcode;
    } else {
      //所有代币
      fundStr = fundListM.map((val) => val.code).join(",");
    }

    let url =
      "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=" + userId + "&Fcodes=" +
      fundStr;
    axios
      .get(url)
      .then((res) => {
        let allAmount = 0;
        let allGains = 0;
        let textStr = null;
        let sumNum = 0;
        if (type == 1) {
          //单个代币
          let val = res.data.Datas[0];
          let data = {
            fundcode: val.FCODE,
            name: val.SHORTNAME,
            jzrq: val.PDATE,
            dwjz: isNaN(val.NAV) ? null : val.NAV,
            gsz: isNaN(val.GSZ) ? null : val.GSZ,
            gszzl: isNaN(val.GSZZL) ? 0 : val.GSZZL,
            gztime: val.GZTIME,
            num: 0
          };
          let slt = fundListM.filter(
            (item) => item.code == data.fundcode
          );
          if (!slt.length) {
            return false;
          }
          data.num = slt[0].num;
          var sum = 0;

          let num = data.num ? data.num : 0;

          if (val.PDATE != "--" && val.PDATE == val.GZTIME.substr(0, 10)) {
            data.gsz = val.NAV;
            data.gszzl = isNaN(val.NAVCHGRT) ? 0 : val.NAVCHGRT;
            sum = (
              (data.dwjz - data.dwjz / (1 + data.gszzl * 0.01)) *
              num
            ).toFixed(1);
          } else {
            if (data.gsz) {
              sum = ((data.gsz - data.dwjz) * num).toFixed(1);
            }

          }


          if (BadgeType == 1) {
            //收益率
            textStr = data.gszzl;
            sumNum = textStr;
          } else {
            //收益额
            if (num != 0) {
              sumNum = sum;
              textStr = formatNum(sum);
            } else {
              sumNum = "0";
              textStr = "0";
            }
          }

        } else {
          //所有代币
          res.data.Datas.forEach((val) => {
            let slt = fundListM.filter(
              (item) => item.code == val.FCODE
            );
            let num = slt[0].num ? slt[0].num : 0;
            let NAV = isNaN(val.NAV) ? null : val.NAV;
            allAmount += NAV * num;
            var sum = 0;
            if (val.PDATE != "--" && val.PDATE == val.GZTIME.substr(0, 10)) {
              let NAVCHGRT = isNaN(val.NAVCHGRT) ? 0 : val.NAVCHGRT;
              sum = (NAV - NAV / (1 + NAVCHGRT * 0.01)) * num
            } else {
              let gsz = isNaN(val.GSZ) ? null : val.GSZ
              if (gsz && NAV) {
                sum = (gsz - NAV) * num
              }
            }
            allGains += sum;

          });
          if (BadgeType == 1) {
            //收益率
            if (allAmount == 0 || allGains == 0) {
              sumNum = "0"
              textStr = "0"
            } else {
              textStr = (100 * allGains / allAmount).toFixed(2);
              sumNum = textStr
            }

          } else {
            //收益额
            sumNum = allGains;
            textStr = formatNum(allGains);
          }
        }


        chrome.browserAction.setBadgeText({
          text: textStr
        });
        let color = Realtime ?
          sumNum >= 0 ?
          "#F56C6C" :
          "#4eb61b" :
          "#4285f4";
        chrome.browserAction.setBadgeBackgroundColor({
          color: color
        });

      })
      .catch((error) => {

      });
  }



};


var startInterval = (RealtimeFundcode, type = 1) => {
  endInterval(Interval);
  let Realtime = isDuringDate();
  RealtimeFundcode = RealtimeFundcode;
  setBadge(RealtimeFundcode, Realtime, type);
  let time = 2 * 60 * 1000;
  if (type == 3) {
    time = 10 * 1000;
  }
  Interval = setInterval(() => {
    if (isDuringDate()) {
      setBadge(RealtimeFundcode, true, type);
    } else {
      chrome.browserAction.setBadgeBackgroundColor({
        color: "#4285f4"
      });
    }
  }, time);
};

var endInterval = () => {
  clearInterval(Interval);
  chrome.browserAction.setBadgeText({
    text: ""
  });
};

var runStart = (RealtimeFundcode, RealtimeIndcode) => {
  initWebSocket();

  // if (showBadge == 1 && BadgeContent == 1) {
  //   if (RealtimeFundcode) {
  //     startInterval(RealtimeFundcode);
  //   } else {
  //     endInterval();
  //   }
  // } else if (showBadge == 1 && BadgeContent == 2) {
  //   startInterval(null, 2);
  // } else if (showBadge == 1 && BadgeContent == 3) {
  //   if (RealtimeIndcode) {
  //     startInterval(RealtimeIndcode, 3);
  //   } else {
  //     endInterval();
  //   }

  // } else {
  //   endInterval();
  // }

};


var getData = () => {
  console.log("getData");
  chrome.storage.sync.get(["holiday", "fundListM", "coinListM", "RealtimeFundcode", "RealtimeIndcode", "showBadge", "BadgeContent", "BadgeType", "userId"], res => {
    RealtimeFundcode = res.RealtimeFundcode ? res.RealtimeFundcode : null;
    RealtimeIndcode = res.RealtimeIndcode ? res.RealtimeIndcode : null;
    console.log("====RealtimeIndcode===")
    console.log(RealtimeIndcode)
    fundListM = res.fundListM ? res.fundListM : [];
    coinListM = res.coinListM ? res.coinListM : [];
    seciList = res.seciList ? res.seciList : [];
    showBadge = res.showBadge ? res.showBadge : 1;
    BadgeContent = res.BadgeContent ? res.BadgeContent : 1;
    BadgeType = res.BadgeType ? res.BadgeType : 1;
    if (res.userId) {
      userId = res.userId;
    } else {
      userId = getGuid();
      chrome.storage.sync.set({
        userId: userId,
      });
    }

    runStart(RealtimeFundcode, RealtimeIndcode);

    // if (res.holiday) {
    //   holiday = res.holiday;
    //   runStart(RealtimeFundcode, RealtimeIndcode);
    // } else {
    //   getHoliday().then(res => {
    //     chrome.storage.sync.set({
    //         holiday: res.data
    //       },
    //       () => {
    //         holiday = res.data;
    //         runStart(RealtimeFundcode, RealtimeIndcode);
    //       }
    //     );
    //   }).catch(err => {
    //     chrome.storage.sync.set({
    //         holiday: {}
    //       },
    //       () => {
    //         holiday = {};
    //         runStart(RealtimeFundcode, RealtimeIndcode);
    //       }
    //     );
    //   });
    // }
  });
}

// console.log("====getData===")
// getData();

chrome.contextMenus.create({
  title: "以独立窗口模式打开",
  contexts: ["browser_action"],
  onclick: () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html"),
      width: 700,
      height: 550,
      top: 200,
      type: "popup",
    }, (function (e) {
      chrome.windows.update(e.id, {
        focused: true
      })
    }))
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // if (request.type == "DuringDate") {
  //   let DuringDate = isDuringDate();
  //   sendResponse({
  //     farewell: DuringDate
  //   });
  // }
  if (request.type == "refresh") {
    console.log("=====getData");
    getData();
  }
  if (request.type == "refreshHoliday") {
    holiday = request.data;
  }
  if (request.type == "refreshBadgeAllGains") {
    //所有价值 约等于账户余额
    let allAmount = 0;
    //日持有收益
    let allGains = 0;
    let sumNum = 0;
    request.data.forEach((val) => {
      //val
      //ACCNAV: "1.6612"
      // CHANGERATIO: "--"
      // FCODE: "001618"
      // GSZ: "1.661"
      // GSZZL: "0.40"
      // GZTIME: "2021-08-12 15:00"
      // HQDATE: "--"
      // ISHAVEREDPACKET: false
      // NAV: "1.6612"
      // NAVCHGRT: "0.41"
      // NEWPRICE: "--"
      // PDATE: "2021-08-12"
      // SHORTNAME: "天弘中证电子ETF联接C"
      // ZJL: "--"
      let slt = fundListM.filter(
        (item) => item.code == val.FCODE
      );
      let num = slt[0].num ? slt[0].num : 0;
      let NAV = isNaN(val.NAV) ? null : val.NAV;
      allAmount += NAV * num;
      var sum = 0;
      if (val.PDATE != "--" && val.PDATE == val.GZTIME.substr(0, 10)) {
        // NAVCHGRT 净值涨跌 0.41
        let NAVCHGRT = isNaN(val.NAVCHGRT) ? 0 : val.NAVCHGRT;
        sum = (NAV - NAV / (1 + NAVCHGRT * 0.01)) * num
      } else {
        let gsz = isNaN(val.GSZ) ? null : val.GSZ;
        if (gsz != null && NAV != null) {
          sum = (gsz - NAV) * num;
        }

      }
      allGains += sum;

    });
    let textStr = null;
    if (BadgeType == 1) {
      //日收益率
      if (allAmount == 0 || allGains == 0) {
        textStr = "0"
        sumNum = "0"
      } else {
        textStr = (100 * allGains / allAmount).toFixed(2);
        sumNum = textStr
      }

    } else {
      //日收益额
      textStr = formatNum(allGains);
      sumNum = allGains;
    }

    chrome.browserAction.setBadgeText({
      text: textStr
    });
    let color = isDuringDate() ?
      sumNum >= 0 ?
      "#F56C6C" :
      "#4eb61b" :
      "#4285f4";
    chrome.browserAction.setBadgeBackgroundColor({
      color: color
    });
  }
  if (request.type == "endInterval") {
    endInterval();
  }
  if (request.type == "startInterval") {
    startInterval(request.id);
  }
  if (request.type == "refreshOption") {
    switch (request.data.type) {
      case "showBadge":
        showBadge = request.data.value;
        break;
      case "BadgeContent":
        BadgeContent = request.data.value;
        break;
      case "BadgeType":
        BadgeType = request.data.value;
        break;
    }
    getData();
  }
  if (request.type == "refreshBadge") {
    let textstr = null;
    let num = 0;
    if (BadgeType == 1) {
      textstr = request.data.gszzl;
      num = request.data.gszzl;
    } else {
      num = request.data.gains;
      textstr = formatNum(request.data.gains);
    }
    chrome.browserAction.setBadgeText({
      text: textstr
    });
    let color = isDuringDate() ?
      num >= 0 ?
      "#F56C6C" :
      "#4eb61b" :
      "#4285f4";
    chrome.browserAction.setBadgeBackgroundColor({
      color: color
    });
  }
});


// 初始化websocket
function initWebSocket() {
  try {
    if ("WebSocket" in window) {
      socket = new WebSocket(wsUrl);
    } else {
      console.log("您的浏览器不支持websocket");
    }
    socket.onopen = websocketOnOpen;
    socket.onerror = websocketOnError;
    socket.onmessage = websocketOnMessage;
    socket.onclose = websocketClose;
  } catch (e) {
    // this.loading = false;
    this.reconnect();
  }
}

/**
     * 获取K线行情数据
     * API: https://huobiapi.github.io/docs/spot/v1/cn/#k-2
     * @param coin { String } 自选币种名称
     * @param period { String } K线周期	1min, 5min, 15min, 30min, 60min, 4hour, 1day, 1mon, 1week, 1year
     */
 function getKline(coin, period = "1day") {
  //
  let data = {
    sub: `market.${coin}usdt.kline.${period}`,
    id: "id1"
  };

  socket.send(JSON.stringify(data));
}

function websocketOnOpen() {
  // this.loading = false;
  console.log("WebSocket连接成功", socket.readyState);
  // 循环订阅每个币种的主题消息d
  if (socket && coinListM.length) {
    // console.log(this.coinListM);
    //列表
    coinListM.forEach(item => {
      getKline(item.code);
    });
  }
   //页头
   seciList.forEach(item => {
    getKline(item);
  });
}
function websocketOnError(e) {
  console.log("WebSocket连接发生错误：", e);
  reconnect();
}

function blob2json(e, callback) {
  let reader = new FileReader();
  reader.readAsArrayBuffer(e, "utf-8");
  reader.onload = function() {
    // console.log("blob转ArrayBuffer数据类型", reader.result);
    // 对数据进行解压
    let msg = pako.ungzip(reader.result, {
      to: "string"
    });
    // console.log("ArrayBuffer转字符串", msg);
    callback && callback(JSON.parse(msg));
  };
}

// 接收数据并处理
function websocketOnMessage(e) {
  blob2json(e.data, res => {
    // console.log("接收到的数据：", res);
    if (res.ping) {
      // 回应心跳包
      this.socket.send(JSON.stringify(res));
    }
    if (res.ch) {
      // 解析币种
      const coinName = res.ch.split(".")[1].split("usdt")[0];
      // 数据缓存到池子中
      dataPool[coinName] = res;
      // 初始化时立即更新一次
      // const coinItem = this.coinListM.filter(
      //   item => item.code === coinName
      // )[0];
      // if (!coinItem.close) {
      //   console.log("初始化更新", coinName);
      //   this.updateTableData(res, coinName);
      // }
      // 节流 限制1000ms内统一批量更新一次。
      throttle(() => {
        // console.log("批量更新数据");
        setBadge();
        //  Object.keys(this.dataPool).forEach(item => {
        //    setBadge(this.dataPool[item], item);
        //  });
      }, 1000);
    }
  });
}

function throttle(fn, timeout) {
  /* 核心技术介绍
      1. 函数节流需要使用变量来存储  上一次触发时间
      2. 这个变量如果是局部变量 ： 则函数完毕会被回收。 如果是全局变量：则会造成全局变量污染
      3.解决方案 ： 利用函数本身也是对象，使用函数本身的静态成员来存储 上一次触发时间
      */
  // 给throttle添加静态成员lastTime
  if (!throttle.lastTime) {
    /* 为什么一定要有这一步呢？
            因为函数对象的属性不存在时，默认取值会得到undefined，而undefined在做数学计算
            的时候会转成number类型得到NaN. Number(undefined) 结果是NaN。无法计算
             */
    throttle.lastTime = 0;
  }

  // 1.记录当前时间
  const currentTime = new Date().getTime();
  // 2.判断触发时间间隔
  if (currentTime - throttle.lastTime > timeout) {
    fn();
    // 3.将当前时间作为 下一次触发时间 参考时间
    throttle.lastTime = currentTime;
  }
}

function websocketClose(e) {
  console.log("connection closed:", e);
  reconnect();
}

function reconnect() {
  console.log("尝试重连");
  // if (this.lockReconnect || this.maxReconnect <= 0) {
  //   return;
  // }
  setTimeout(() => {
    // this.maxReconnect-- // 不做限制 连不上一直重连
    initWebSocket();
  }, 10 * 1000);
}