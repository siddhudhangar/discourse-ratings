import { ajax } from 'discourse/lib/ajax';
import { popupAjaxError } from 'discourse/lib/ajax-error';

let ratingEnabled = function(type, tags, categoryId) {
  let category = Discourse.Category.findById(categoryId),
      catEnabled = category && category.rating_enabled,
      tagEnabled = tags && tags.filter(function(t){
                      return Discourse.SiteSettings.rating_tags.split('|').indexOf(t) !== -1;
                   }).length > 0,
      typeEnabled = type === 'rating';

  return catEnabled || tagEnabled || typeEnabled;
};

let removeRating = function(postId) {
  return ajax("/rating/remove", {
    type: 'POST',
    data: {
      post_id: postId,
    }
  }).then(function (result, error) {
    if (error) {
      popupAjaxError(error);
    }
  });
};

let editRating = function(postId, rating) {
  return ajax("/rating/rate", {
    type: 'POST',
    data: {
      post_id: postId,
      rating: rating
    }
  }).then(function (result, error) {
    if (error) {
      popupAjaxError(error);
    }
  });
};

let starRatingRaw = function(rating, opts = {}) {
  let content = '';
  for (let i = 0; i < 5; i++) {
    let value = i + 1;
    let checked = value <= rating ? 'checked' : '';
    let disabled = opts.enabled ? '' : ' disabled';
    let star = '';

    if (opts.clickable) {
      star += '<span class="' + checked + disabled + '"></span>';
    } else {
      star += '<input class="' + disabled + '"type="radio" value="' + value + '" ' + checked + disabled + '>';
    }

    star += '<i></i>';
    content = content.concat(star);
  }

  return '<span class="star-rating">' + content + '</span>';
};

var getBadges1 = function(post_id, topicId, username) {
  return ajax("/rating/badges", {
    type: 'GET',
    dataType: "json",
    accept: 'json',
    data: {
      post_id: post_id,
      username: username,
      topic_id: topicId
    },
  }).then(function (result, error) {
    if (error) {
      console.log("error")
      popupAjaxError(error);
    }
    
    if (result){
      return result
    }else{
      return null
    }
    
  });
};


var getBadges = function(post_id, topicId, username) {
let badgeInfo=false
var xhr = new XMLHttpRequest();
  var url='/rating/badges?post_id='+post_id
  
  xhr.open('GET', url,false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

  
  xhr.onload = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {
        console.log("aaaaaaaaaaaaaaaaaaa")
        badgeInfo = JSON.parse(xhr.responseText);
      }
   };
  xhr.send();
  return badgeInfo
};

export { ratingEnabled, removeRating, editRating, starRatingRaw , getBadges};
