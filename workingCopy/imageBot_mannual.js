test_only = 0;
var Twit = require('twit')
var fs = require('fs')
var request = require('request');
var uuid = require('node-uuid');
var PythonShell = require('python-shell');


config = require('./config');

var T = new Twit(config);

var cron = require('cron');    

    
  


//get date string for today's date (e.g. '2011-01-01')
function datestring () {
  var d = new Date(Date.now() - 48*60*60*1000);  //est timezone PST
  return d.getUTCFullYear()   + '-'
     +  (d.getUTCMonth() + 1) + '-'
     +   d.getDate() ;
};


//
//  tweet 'hello world!'
//
//T.post('statuses/update', { status: 'hello world!' }, function(err, data, response) {
//  console.log(data)
//})

// construct search string
var searchString = '#Monochrome OR #BW OR #blackandwhitephotography OR #blackandwhite'

// Add filter 
searchString = searchString.concat(' min_faves:3  min_retweets:2' + ' since:' + datestring() );

function tweetReply(tweet_status_id,reply_tweet,imageFileName){
    
    var imageMedia = fs.readFileSync(imageFileName, { encoding: 'base64' })

    // first we must post the media to Twitter
    if (!test_only) { 
        T.post('media/upload', { media_data: imageMedia }, function (err, data, response) {
  
	    console.log('Media Uploaded')
            // now we can assign alt text to the media, for use by screen readers and
            // other text-based presentations and interpreters
            var mediaIdStr = data.media_id_string
            var altText = "Image automatically colored using neural nets #deeplearning"
            var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

            T.post('media/metadata/create', meta_params, function (err, data, response) 
                   { if (!err) 
                       { 
	                  console.log('Media tagged with Metadata')
                           // now we can reference the media and post a tweet (media will attach to the tweet) 
                           var params = { status: reply_tweet , media_ids: [mediaIdStr],  in_reply_to_status_id: tweet_status_id} 
				console.log(params)
                           T.post('statuses/update', params, function (err, data, response) { 
 				console.log(err)
                               console.log('sent: ' +data.text) 
                           }) 
                       } 
                   }) 
        }) 
    } else { 
        console.log('Reply Tweet : ' + reply_tweet ) 
        console.log('       Attached Image: ' + imageFileName ) 
    }
}
function tweetProcess(tweet_status_id,reply_tweet,imageFileName){
    console.log('tweetProcess: running pythonshell with' + imageFileName );
    var colorFileName = imageFileName + '_color.png';
    PythonShell.run('colorize.py', { args: [imageFileName, colorFileName ]}, function(err, results){
          if (err) //throw err;
	 console.log(err);
            // results is an array consisting of messages collected during execution 
          //console.log('results: %j', results);
          tweetReply(tweet_status_id,reply_tweet,colorFileName);
    });
}

function searchCallback_old(err, data, response) {
  //console.log(data)
  tweets = data.statuses;

  for (index in tweets) {

    img_url = tweets[index].entities.media[0].media_url;

    console.log('Reading Tweets:')
    console.log('       ' + tweets[index].text);
    console.log('       ' + img_url);

    inputImage = 'download/' + uuid.v4()
    imageStream = fs.createWriteStream(inputImage);

    imageStream.on('close', function(inputImage) {
        console.log('       File saved to : '+inputImage);
        var reply_tweet  = 'Hi @' + tweetMsg.user.screen_name + ' how\'s this? Colors hallucinated by neural nets #DEEPLEARNING #BWTOCOLOR';
        tweetProcess(tweets[index].id_str,tweets[index].user.screen_name,inputImage)
    
    });

    imageStream.on('error', function(err) {
      console.log("     ERROR (imageStream):" + err);
    });

    request
        .get(img_url)
        .on('error', function(err) { 
            console.log(err) 
        }) 
        .pipe(imageStream); 



  }

  

}

// from http://stackoverflow.com/questions/5454235/javascript-shorten-string-without-cutting-words

function wordTrim(value, length) {

    if (value.length <= length) return value;

    var strAry = value.split(' ');
    var retLen = strAry[0].length;

    for (var i = 1; i < strAry.length; i++) {
        if(retLen == length || retLen + strAry[i].length + 1 > length) break;
        retLen+= strAry[i].length + 1
    }

    return strAry.slice(0,i).join(' ');

}


var strftime = require('strftime') // not required in browsers
function processImageTweet (tweetMsg) {

   //console.log(tweetMsg.entities.media)
   img_url = tweetMsg.entities.media[0].media_url;

   dateStr = strftime('%B %d %I:%M%P',new Date(Date.parse(tweetMsg.created_at))) 
   textStr = tweetMsg.text // // remove newline 

   // Remove the URL. For now remove everything after the url.
   textStr = textStr.substring(0, tweetMsg.entities.media[0].indices[0]);

   textStr = textStr.replace(/(\r\n|\n|\r)/gm," ") // // remove newline 

   // console.log('       ' + tweetMsg.created_at.toLocaleString());
   console.log('(' + dateStr + ') r:' + tweetMsg.retweet_count + ' <3:' + tweetMsg.favorite_count + ' ' +  textStr);
   console.log('       ' + img_url);

   var reply_tweet  = 'Hi @' + tweetMsg.user.screen_name + ' how\'s this? Colorized by neural nets #DEEPLEARNING #BWTOCOLOR ' + textStr;

   // Trim with whole words. solution from stack overflow
   reply_tweet = reply_tweet.replace(/^(.{100}[^\s]*).*/, "$1") // Make sure the twitter Lenght does not exceed 117
// maintain the limit of 140 charaters
//   reply_tweet = wordTrim(reply_tweet, 117)
   console.log(reply_tweet.length)

     
    var inputImage = 'download/' + uuid.v4()
    imageStream = fs.createWriteStream(inputImage);
  
    imageStream.on('close', function() {
        console.log('       file Saved to : '+inputImage);
        tweetProcess(tweetMsg.id_str,reply_tweet,inputImage)
    
    });

    imageStream.on('error', function(err) {
      console.log("     ERROR (imageStream):" + err);
    });

    request
        .get(img_url)
        .on('error', function(err) {
            console.log(err) 
        })
        .pipe(imageStream); 

}   

function searchCallback(err, data, response) {
  //console.log(data)
  tweets = data.statuses;
    
  for (index in tweets) {

    processImageTweet(tweets[index])
            
            
  }         
            

            
}

  


// Setting up a user stream
//var stream = T.stream('user');

/*
// When someone follows me
stream.on('follow', followed);

function followed(eventMsg) {
  var name = eventMsg.source.name;
  var screenName = eventMsg.source.screen_name;

  var randomNo = Math.floor(Math.random()*1000);

  postTweets('@'+ screenName + ' '+randomNo+ ' Thank you for following me. And do you know #buddha was born in #Nepal? Please visit his birthplace, Nepal.');
}
*/


function tweetEvent(eventMsg) { 
    var fs = require('fs');
    var json = JSON.stringify(eventMsg,null,2);

    var replyTo = eventMsg.in_reply_to_screen_name;
    var text = eventMsg.text;
    var tweet_status_id = eventMsg.id_str;
    var from = eventMsg.user.screen_name;

    console.log(eventMsg.entities.media)
    console.log(replyTo + ' : : ' + from)

    if (replyTo === 'ColorizeBot') {

        if (from === 'ColorizeBot') {
            console.log(' My tweet do not reply')
        } else { 
            if (eventMsg.entities.media)
                processImageTweet(eventMsg)
            else { 
                var reply_tweet = '@' + from + ' thank you for tweeting me. Tweet me a BW image and I will color it #BWTOCOLOR'

                if (test_only)
                    console.log(reply_tweet) 
                else  { 
                    var params = { status: reply_tweet ,  in_reply_to_status_id: tweet_status_id} 
                           T.post('statuses/update', params, function (err, data, response) { 
                               console.log('sent: ' +data.text) 
                           }) 
                } 
            } 
        } 
     }

}

// When someone tweets the Bot
//stream.on('tweet', tweetEvent);

var cron = require('cron');

//var job = new cron.CronJob('0 0 23 * * *', function() {
    console.log('Function executed!' + new Date);
    T.get('search/tweets', { q:searchString ,  result_type: 'mixed', since: datestring(),  count: 10, exclude:'replies', exclude:'retweets', filter:'twimg' }, searchCallback) 
//}, null, true, 'America/Los_Angeles');


console.log('Twitter Event Started');
