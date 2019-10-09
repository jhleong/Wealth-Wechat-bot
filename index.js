



require('dotenv').config();
const express = require('express');
const request = require('request');
const http = require('http');
const wechat = require('wechat'); // Github: https://github.com/node-webot/wechat
const uuidv1 = require('uuid/v1');

const app = express();
const router = express.Router();

const config = {
  token: process.env.TOKEN,
  appid: process.env.APP_ID,
  app_secret: process.env.APP_SECRET,
  dialog_flow_auth: process.env.DIALOG_FLOW_AUTH
  // encodingAESKey: ''
};

function logResponseBody(req, res, next) {
  var oldWrite = res.write,
      oldEnd = res.end;

  var chunks = [];

  res.write = function (chunk) {
    chunks.push(new Buffer(chunk));

    oldWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk)
      chunks.push(new Buffer(chunk));

    var body = Buffer.concat(chunks).toString('utf8');
    console.log(req.path, body);

    oldEnd.apply(res, arguments);
  };

  next();
}

const const_sessionId = uuidv1();


// retrieve wechat access token which will expire in 2hours
var wechat_access_token = null;
var wechat_access_token_expire = 0;
setInterval(function(){
  if(wechat_access_token == null || wechat_access_token_expire < 0){
    request.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid='+ config.appid +'&secret=' + config.app_secret , { json:true},   
    (err, df_res, body) => {
      if (err) { return console.log(err); }
        
        if(body.access_token != null){
          console.log('ACCESS_TOKEN:', body.access_token)
          //console.log("body, access_token, exires_in", body, body.access_token, body.expires_in);
          wechat_access_token = body.access_token;
          wechat_access_token_expire = 3600; // 1h in minutes

          request.post('https://api.weixin.qq.com/cgi-bin/menu/create?access_token='+wechat_access_token, {      
  json: {
    "button":[
    {    
         "type":"click",
         "name":"Acc Overview",
         "key":"RICH_SUMMARY"
     },
     {
          "name":"Action",
          "sub_button":[         
           {
              "type":"click",
              "name":"WatchList",
              "key":"RICH_WATCHLIST"
           },
           {
            "type":"click",
            "name":"Blotter",
            "key":"RICH_BLOTTER"
         },
         {
          "type":"media_id",          
          "name":"Portfolio",
          "media_id":"6Z_4s7hDEdUqAZItmyVxYklOuwjaNOW56eLy23aEwNg"
       }           
          ]
      },
      {
      "name":"Help",
          "sub_button":[  
            {
              "type":"view",
              "name":"Contact Support",
              "url":"https://www.RICH-wealth-platform.com/contact/support"
           },  
            {
            "type":"media_id",
            "name":"About RICH",
            "media_id":"6Z_4s7hDEdUqAZItmyVxYkUdbikAOZvEuTMpnPlPPF0"
         }    
           ]
        },     
    ]
  } }, (err, df_res, df_body) => {
    if (err) { return console.log(err); }
    console.log(df_body);
   
    });
        }
      })
  }
  wechat_access_token_expire = wechat_access_token_expire - 1;
  //console.log('token, timer', wechat_access_token, wechat_access_token_expire)
}, 1000);


app.use(express.query());
app.use(logResponseBody);



app.use('/wechat', wechat(config, function (req, res, next) {
  // All WeChat related info are in req.weixin
  var message = req.weixin;
  console.log('weixin_msg:',message);
  // Wechat expects you to respond, or else it will tell the user that the service is unavailable after three tries.
  //res.reply(message);;

  if(message.MsgType =='text' && message.Content == 'goog'){
    res.reply({
      type: "image",
      content: {
        mediaId: '6Z_4s7hDEdUqAZItmyVxYuS3ueYeMAvPgoS0wKtOj0o'
      }
    });
  } else if(message.MsgType =='text'){

  request.post('https://api.dialogflow.com/v1/query?v=20170712', { 
    auth: {
      "bearer": config.dialog_flow_auth
    },  
  json: {   
    "lang": "en",
    "query": message.Content,
    "sessionId": const_sessionId,
    "timezone": "Asia/Hong_Kong"
  } }, (err, df_res, df_body) => {
    if (err) { return console.log(err); }
    console.log(df_body);
    //console.log(df_body.explana);

    // res.reply(
    //   {type: "text", content: [df_body.result.fulfillment.speech, "ok", "what"]}
    //  );


    if(df_body.result.metadata.intentName && df_body.result.metadata.intentName =='Default Welcome Intent')
    {
      res.reply([
        {
          title: 'RICH Wealth Platform',
          description: df_body.result.fulfillment.speech,
          picurl: 'http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrd8wVRMpUOibDb6nicxMB7aHKEjiblibDgtrdJG4PXuFwY4Cmbxku2wB0mqw\/0?wx_fmt=png',
          url: 'http://www.RICH-wealth-platform.com/'
        }
      ])
    } else if(df_body.result.metadata.intentName && df_body.result.metadata.intentName =='RICH_SUMMARY'){
      res.reply(
        { type: "text", 
          content: '22 Mar 2019 @ 11:30am\n' +
                   'Account Overview:' + '\n' + 
                   '\t\t4 orders executed.\n' + 
                   '\t\t5 orders still not filled.\n' + 
                   '\n' +
                   'Acc: SG Dynamic Fund\n  NAV:SGD 1,230,540,\n  UnRel P&L: 211,238,\n  Daily P&L: 54,812\n' + 
                   'Acc: FX_ACCT\n  NAV:USD 550,540,\n  UnRel P&L: 23,118,\n  Daily P&L: -39,156\n'
                   
      });
    } else if(df_body.result.metadata.intentName && df_body.result.metadata.intentName =='RICH_BLOTTER'){
      res.reply(
        { type: "text", 
          content: 'RICH blotter:' + '\n' + 
                   'EXECUTED-BOUGHT 4,000 of OCBC Rg @ 10.50 on SGX.\n' + 
                   'EXECUTED-BOUGHT 1,000 of Apple Rg @ 175.4 on NASDAq.\n' + 
                   'EXECUTED-SOLD 2,000 of Tecent Hldg Rg @ 12 on HKSE.\n' + 
                   'EXECUTED-SOLD 5,000 of Genting Spore Rg @ 1.01 on SGX.\n' 
      });
    }else if(df_body.result.metadata.intentName && df_body.result.metadata.intentName =='RICH_PORTF_RETURN'){
      res.reply({
        type: "image",
        content: {
          mediaId: '6Z_4s7hDEdUqAZItmyVxYuuK8YD2sdEgls4fNl8rzsQ'
        }
      });
    }
    else if(df_body.result.metadata.intentName && df_body.result.metadata.intentName =='goog'){
      res.reply({
        type: "image",
        content: {
          mediaId: '6Z_4s7hDEdUqAZItmyVxYuS3ueYeMAvPgoS0wKtOj0o'
        }
      });
    }
     else {
          res.reply(
             {type: "text", content: df_body.result.fulfillment.speech }
          )
    }
  });

} else if(message.MsgType =='event'){
  if(message.EventKey == 'RICH_BLOTTER'){
    res.reply(
      { type: "text", 
        content: 'RICH blotter:' + '\n' + 
                 'EXECUTED-BOUGHT 4,000 of OCBC Rg @ 10.50 on SGX.\n' + 
                 'EXECUTED-BOUGHT 1,000 of Apple Rg @ 175.4 on NASDAq.\n' + 
                 'EXECUTED-SOLD 2,000 of Tecent Hldg Rg @ 12 on HKSE.\n' + 
                 'EXECUTED-SOLD 5,000 of Genting Spore Rg @ 1.01 on SGX.\n' 
    });
  } else if(message.EventKey == 'RICH_SUMMARY'){
    res.reply(
      { type: "text", 
        content: '22 Mar 2019 @ 11:30am\n' +
                 'Account Overview:' + '\n' + 
                 '\t\t4 orders executed.\n' + 
                 '\t\t5 orders still not filled.\n' + 
                 '\n' +
                 'Acc: SG Dynamic Fund\n  NAV:SGD 1,230,540,\n  UnRel P&L: 211,238,\n  Daily P&L: 54,812\n' + 
                 'Acc: FX_ACCT\n  NAV:USD 550,540,\n  UnRel P&L: 23,118,\n  Daily P&L: -39,156\n'
                 
    });
  } else {
    res.reply(
      {type: "text", content: "event: " + message.EventKey + " not captured !"}
    );
  }

    
} else {
  res.reply(
    {type: "text", content: "Message type not supported at the moment."}
  );
}
 

  
  // Doc: https://github.com/node-webot/wechat/blob/master/README.en.md

  //https://api.dialogflow.com/v1/query?v=20170712
}));

app.use('/dialogflow', function (req, res, next) {
  //console.log(req.body);

  //res.reply('dialogflow');

});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var port = process.env.PORT || '4000';
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

server.on('error', onError);
server.on('listening', onListening);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}




// image uploaded
/*
{"url":"http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrdCvEtn22d6h9aemou0PhgBvR0AcuBBicBsYGUwSlIcusC7MKG6sJy8UA\/0"}

"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=19_Brcm1Ql9OBGL03vNDn6SoO7YdfWdhuZzezgRWrGiUMYZFle2nh0CzIRCwnHGCX6ukJJT_sqCqKu050eACkIaDflH9EFgrvjesunqgei5cDxTsfNHEEJUF3FCK7pFTYAgnAT3VFM7kTax7nJSTBQgAJAJRG&type=image" \
-F media=@RICH_logo_small.png -F  description='{"title":"RICH Logo" , "introduction":"RICH Logo"}'

{"media_id":"6Z_4s7hDEdUqAZItmyVxYkwRg-IqGwEv6iqsxeS4l0E","url":"http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrdCvEtn22d6h9aemou0PhgBvR0AcuBBicBsYGUwSlIcusC7MKG6sJy8UA\/0?wx_fmt=png"}
{"media_id":"6Z_4s7hDEdUqAZItmyVxYhhYCyJvoNotiyOSJ4DTYso","url":"http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrd8wVRMpUOibDb6nicxMB7aHKEjiblibDgtrdJG4PXuFwY4Cmbxku2wB0mqw\/0?wx_fmt=png"}

news
{"media_id":"6Z_4s7hDEdUqAZItmyVxYkUdbikAOZvEuTMpnPlPPF0"}

curl "https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=19_JEyqSffHiAxUJ_oOHcEm5lR4XmNQ1lbdjWB110HX_18lfBmNyKTL8zQ95I6vfBoRLb0aTB76Ki5Y4kYJ8JLmbDcZ9on5mGdYfTkz02gnQokIwvj2NGaFUp7FMXH-oy7lNv1D3EWTGq9pIiecKZYfAIANCB&type=image" \
-F media=@portf.png -F  description='{"title":"Portfolio Allocation" , "introduction":"Portfolio Allocation"}'

{"media_id":"6Z_4s7hDEdUqAZItmyVxYgFlAHV21NDZ-pdeS74GCic","url":"http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrdQtl1gAD1ko6sav1pdJEicDzicSP8wujH4icaBFJghMEwasM8iaMRdnBgVQ\/0?wx_fmt=png"}

curl -H "Content-Type: application/json" \
-X POST \
-d '{"articles": [{"title": "SG Dynamic Fund","thumb_media_id": "6Z_4s7hDEdUqAZItmyVxYgFlAHV21NDZ-pdeS74GCic","author": "JianHaur.Leong","digest": "Portfolio Statistics","show_cover_pic": 1,"content": "<p>NAV: SGD 1,230,540<br>UnRel P&L: 211,238 Daily P&L: 54,812</p><p>Performance: 3 Months: 3.4%, 6 Months: -1.5, 1 yr: -5.4</p><p>VaR (95% 1-month): 10,334<br>Sharp Ratio: 1.04, Sortino Ratio:0.98<br>Volatility: 0.08, Downside Risk: 0.09</p","content_source_url": "http:\/\/perseus.duckdns.org\/RICHchatbot_images\/sg-dyn-fund-portf.png'}]}"" \
"https://api.weixin.qq.com/cgi-bin/material/add_news?access_token=19_JEyqSffHiAxUJ_oOHcEm5lR4XmNQ1lbdjWB110HX_18lfBmNyKTL8zQ95I6vfBoRLb0aTB76Ki5Y4kYJ8JLmbDcZ9on5mGdYfTkz02gnQokIwvj2NGaFUp7FMXH-oy7lNv1D3EWTGq9pIiecKZYfAIANCB"

{"media_id":"6Z_4s7hDEdUqAZItmyVxYklOuwjaNOW56eLy23aEwNg"}

{"media_id":"6Z_4s7hDEdUqAZItmyVxYt48m5jgwygIPCC76vonMUk"}

{"media_id":"6Z_4s7hDEdUqAZItmyVxYhB2IciBSaBjOt6dgrxkdXo"}

curl "https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=19_HqyVAZICZu9lEnFsXor-2fHqpvmb4BDlT1b-Gf9TcKi0nWDstoiLm2OrcKcdBG8IDd6mtvkdn1i_O-7XIyBsRGYJxLkojeSVazqSmRemaPZLGc14TQG0ApDWpERqjVNNkmm9_40S511Y8dsCRLCdACAWQH&type=image" \
-F media=@goog.png -F  description='{"title":"GOOG" , "introduction":"GOOG"}'

{"media_id":"6Z_4s7hDEdUqAZItmyVxYuS3ueYeMAvPgoS0wKtOj0o","url":"http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrd8Fbne07k8q1Qd5uQy30Yiacia8KfP8p1wxTrVjmicdq4wyc0EH64LFeEQ\/0?wx_fmt=png"}

curl "https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=19_iUQb_CdIsAvgzlU-RWPo64W7LoheD6eUuBcueZ5AADfMAFBS_GEazXxo3EhUlTiNFhVG4ajyLcVkPtv4wSRA8sNxZq2gk1lQUF_6D0rcwdAQzv_sL2Gpv4lLq8pPaV-9bkGAqG1NP5AYFAnNVDPiAFAJRD&type=image" \
-F media=@portf_return.png -F  description='{"title":"Portfolio Return" , "introduction":"Portfolio Return"}'

{"media_id":"6Z_4s7hDEdUqAZItmyVxYuuK8YD2sdEgls4fNl8rzsQ","url":"http:\/\/mmbiz.qpic.cn\/mmbiz_png\/vOjTnQzKNDmacDYssd9MwplATlGPicOrdpBEeO3Q6UEu48AmXfibDZICUNx4PGRgtnH7PnwXIRGEf9dakOqOS3Dg\/0?wx_fmt=png"}

*/