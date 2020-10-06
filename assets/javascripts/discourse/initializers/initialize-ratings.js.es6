import Composer from 'discourse/models/composer';
import Category from 'discourse/models/category';
import { withPluginApi } from 'discourse/lib/plugin-api';
import { default as discourseComputed, on, observes } from "discourse-common/utils/decorators";
import { notEmpty, and, alias, or } from "@ember/object/computed";
import { ratingListHtml, getBadges } from '../lib/rating-utilities';
import { scheduleOnce, later } from "@ember/runloop";
const badgeClass =  ["badge-type-gold", "badge-type-silver", "badge-type-bronze"];
const { iconNode } = require("discourse-common/lib/icon-library");

export default {
  name: 'initialize-ratings',
  initialize(container){
    const siteSettings = container.lookup('site-settings:main');
    
    if (!siteSettings.rating_enabled) return;
    
    Composer.serializeOnCreate('ratings', 'ratingsString');
    Composer.serializeOnUpdate('ratings', 'ratingsString');

    withPluginApi('0.10.0', api => {
      const currentUser = api.getCurrentUser();
      
      api.includePostAttributes("ratings");

      api.decorateWidget("poster-name:after", function(helper) {
        const post = helper.getModel();

        const post_id = helper.attrs.id
        const topicId = helper.attrs.topicId
        const username = helper.attrs.username
        //console.log(post);
        //console.log(post_id);
        //console.log(topicId);
        //console.log(username);
        var badges_info = getBadges(post_id,topicId,username)
        //console.log(badges_info);

        if (post.topic.show_ratings && post.ratings) {
          //return helper.rawHtml(
          //  `${new Handlebars.SafeString(ratingListHtml(post.ratings))}`
          //);
        }
        if (badges_info && badges_info["total_posts"] !=0 ) {
        var badgeArray=[]
          for (var i = 1; i < badges_info["total_posts"]+1; i++) {
            var slug = badges_info[i].name.toLowerCase()
            var badge_slug = slug.replace(" ","-")
            //console.log(badge_slug)
            //console.log(i)
            //console.log("====================================")
            badgeArray.push({ 
              icon: badges_info[i].icon.replace("fa-",""),
              image: badges_info[i].image,
              className: badgeClass[badges_info[i].badge_type_id-1],
              name: badges_info[i].name,
              id: badges_info[i].id,
              badgeGroup: badges_info[i].badge_grouping_id,
              title: badges_info[i].name,
              url: `/badges/${badges_info[i].id}/${badge_slug}`
            });
            //console.log("====================================")
            //console.log(badgeArray)
          }

            let trustLevel = "";
            let highestBadge = 0;
            function buildBadge(badge) {
            if (badge) {
                let iconBody;
                if(badge.image) {
                  iconBody = helper.h("img", { attributes: { src: badge.image , height: '40px', width: '40px'} });
                } else if (badge.icon) {
                  iconBody = iconNode(badge.icon);
                }
                if(badge.url) {
                  iconBody = helper.h("a", { attributes: { href: badge.url , height: '40px', width: '40px'} }, iconBody);
                }
                if(badge.badgeGroup === 4 && badge.id > highestBadge) {
                  highestBadge = badge.id;
                  trustLevel = badge.name + "-highest";
                }
                return helper.h("span.poster-icon", { className: badge.className + " " + badge.name, attributes: { title: badge.name } }, iconBody);
              }
            }
            let posterBadges = [];
            badgeArray.forEach(badgeParts => {
              posterBadges.push(buildBadge(badgeParts));
            });
            //console.log(posterBadges)
            return helper.h("div.poster-icon-container", { className: trustLevel }, posterBadges);
          }
      });
      
      api.reopenWidget("poster-name", {
        buildClasses(attrs) {
          const post = this.findAncestorModel();
          let classes = [];
          if (post &&
              post.topic &&
              post.topic.show_ratings &&
              post.ratings) {
            classes.push('has-ratings');
          }
          return classes;
        }
      })

      api.modifyClass('model:composer', {
        editingPostWithRatings: and('editingPost', 'post.ratings.length'),
        hasRatingTypes: notEmpty('ratingTypes'),
        showRatings: or('hasRatingTypes', 'editingPostWithRatings'),
        
        @discourseComputed('editingPostWithRatings', 'topicFirstPost', 'post.ratings', 'allowedRatingTypes.[]', 'topic.user_can_rate.[]')
        ratingTypes(editingPostWithRatings, topicFirstPost, postRatings, allowedRatingTypes, userCanRate) {
          let types = [];
          
          if (editingPostWithRatings) {
            types.push(...postRatings.map(r => r.type));
          }
          
          if (topicFirstPost && allowedRatingTypes.length) {
            allowedRatingTypes.forEach(t => {
              if (types.indexOf(t) === -1) {
                types.push(t);
              }
            });
          } else if (userCanRate && userCanRate.length) {
            userCanRate.forEach(t => {
              if (types.indexOf(t) === -1) {
                types.push(t);
              }
            })
          }
          
          return types;
        },
        
        @discourseComputed('ratingTypes', 'editingPostWithRatings', 'post.ratings')
        ratings(ratingTypes, editingPostWithRatings, postRatings) {
          const typeNames = this.site.rating_type_names;
          
          return ratingTypes.map(type => {
            let currentRating = (postRatings || []).find(r => r.type === type);
            let value;
            let include;
                        
            if (editingPostWithRatings && currentRating) {
              value = currentRating.value;
              include = (currentRating.weight > 0) ? true : false;
            }
            
            let rating = {
              type,
              value,
              include: include !== null ? include : true
            };
                        
            if (typeNames && typeNames[type]) {
              rating.typeName = typeNames[type];
            }
            
            return rating;
          })
        },
        
        @discourseComputed('tags', 'category')
        allowedRatingTypes(tags, category) {
          const site = this.site;
          let types = [];
          
          if (category) {
            const categoryTypes = site.category_rating_types[Category.slugFor(category)];
            if (categoryTypes) {
              types.push(...categoryTypes);
            }
          }
          
          if (tags) {
            const tagTypes = site.tag_rating_types;
            if (tagTypes) {
              tags.forEach(t => {
                if (tagTypes[t]) {
                  types.push(...tagTypes[t]);
                }
              });
            }
          }
                    
          return types;
        },
        
        @discourseComputed('ratings')
        ratingsToSave(ratings) {
          return ratings.map(r => ({
            type: r.type,
            value: r.value,
            weight: r.include ? 1 : 0
          }));
        },
        
        @discourseComputed('ratingsToSave')
        ratingsString(ratingsToSave) {
          return JSON.stringify(ratingsToSave);
        }
      });

      api.modifyClass('controller:composer', {
        save() {
          const model = this.model;
          const ratings = model.ratings;
          const showRatings = model.showRatings;
          
          if (showRatings && ratings.some(r => r.include && !r.value)) {
            return bootbox.alert(I18n.t("composer.select_rating"));
          }
          
          return this._super();
        }
      });

      api.modifyClass('component:composer-body', {
        @observes('composer.showRatings')
        resizeIfShowRatings() {
          if (this.get('composer.viewOpen')) {
            this.resize();
          }
        }
      });
      
      api.registerCustomPostMessageCallback("ratings", (controller, data) => {
        const model = controller.get("model");
                
        model.set('ratings', data.ratings);
        model.get('postStream')
          .triggerChangedPost(data.id, data.updated_at)
          .then(() => {
            controller.appEvents.trigger("post-stream:refresh", { id: data.id });
          });
        
        if (data.user_id === currentUser.id) {
          model.set('user_can_rate', data.user_can_rate);
        }
        
        controller.appEvents.trigger("header:update-topic", model);
      });

      api.modifyClass('component:topic-list-item', {
        hasRatings: and('topic.show_ratings', 'topic.ratings'),
        
        @discourseComputed("topic", "lastVisitedTopic", "hasRatings")
        unboundClassNames(topic, lastVisitedTopic, hasRatings) {
          let classes = this._super(topic, lastVisitedTopic) || "";
          if (hasRatings) {
            classes += ' has-ratings';
          }
          return classes;
        }
      });
      
      api.modifyClass('component:topic-title', {
        hasRatings: alias('model.show_ratings'),
        editing: alias('topicController.editingTopic'),
        hasTags: notEmpty('model.tags'),
        showTags: and('hasTags', 'siteSettings.tagging_enabled'),
        hasFeaturedLink: notEmpty('model.featured_link'),
        showFeaturedLink: and('hasFeaturedLink', 'siteSettings.topic_featured_link_enabled'),
        hasExtra: or('showTags', 'showFeaturedLink'),
        classNameBindings: ['hasRatings', 'editing', 'hasExtra'],
        
        @on('init')
        setupController() {
          const topicController = container.lookup('controller:topic');
          this.set('topicController', topicController);
        }
      })
    });
  }
};
