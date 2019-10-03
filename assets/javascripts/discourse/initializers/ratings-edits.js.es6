import Composer from 'discourse/models/composer';
import { withPluginApi } from 'discourse/lib/plugin-api';
import { default as computed, on, observes } from 'ember-addons/ember-computed-decorators';
import { ratingEnabled, removeRating, editRating, starRatingRaw, getBadges } from '../lib/rating-utilities';
const badgeClass =  ["badge-type-gold", "badge-type-silver", "badge-type-bronze"];
const { iconNode } = require("discourse-common/lib/icon-library");
const { h } = require("virtual-dom");
var badgeCache = {}

export default {
  name: 'ratings-edits',
  initialize(){

    Composer.serializeOnCreate('rating');
    Composer.serializeOnCreate('rating_target_id', 'rating_target_id');
    Composer.serializeToTopic('rating_target_id', 'topic.rating_target_id');

    withPluginApi('0.8.10', api => {
    var chk_page_refresh_or_not = false
      api.includePostAttributes('rating');

      api.decorateWidget('poster-name:after', function(helper) {
        const rating = helper.attrs.rating;
        const model = helper.getModel();
        const post_id = helper.attrs.id
        const topicId = helper.attrs.topicId
        const username = helper.attrs.username
        //console.log(helper.attrs.username)
        //console.log(post_id)
        //console.log(topicId)
        badgeCache[topicId]=topicId
        //console.log(badgeCache)

        var badges_info = getBadges(post_id,topicId,username)
        console.log(badges_info)
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
                  iconBody = helper.h("img", { attributes: { src: badge.image } });
                } else if (badge.icon) {
                  iconBody = iconNode(badge.icon);
                }
                if(badge.url) {
                  iconBody = helper.h("a", { attributes: { href: badge.url } }, iconBody);
                }
                if(badge.badgeGroup === 4 && badge.id > highestBadge) {
                  highestBadge = badge.id;
                  trustLevel = badge.name + "-highest";
                }
                return helper.h("span.poster-icon", { className: badge.className + " " + badge.name, attributes: { title: badge.title } }, iconBody);
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


      api.modifyClass('model:composer', {
        includeRating: false,
        includeRatingTargetId: false,
        ratingTargetId: undefined,

        @on('init')
        @observes('post', 'ratingEnabled')
        setRating() {
          const post = this.get('post');
          const editing = this.get('editingPost');
          const creating = this.get('creatingTopic');
          const enabled = this.get('ratingEnabled');

          if (editing && post && post.rating) {
            this.setProperties({
              rating: post.rating,
              includeRating: true
            });
          }

          if (enabled && creating) {
            this.set('includeRating', true);
          }
        },

        @computed('subtype','tags','categoryId')
        ratingEnabled(subtype, tags, categoryId) {
          return ratingEnabled(subtype, tags, categoryId);
        },

        @computed('ratingEnabled', 'hideRating', 'topic', 'post')
        showRating(enabled, hide, topic, post) {
          if (hide) return false;

          if ((post && post.get('firstPost') && topic.rating_enabled) || !topic) {
            return enabled;
          }

          if (topic.can_rate) return true;

          return topic.rating_enabled && post && post.rating && (this.get('action') === Composer.EDIT);
        },

        @computed('ratingEnabled')
        showRatingTargetId(enabled) {
          const user = this.user;
          const setting = Discourse.SiteSettings.rating_target_id_enabled;
          return enabled && setting && user.admin;
        },

        @observes('topic.rating_target_id')
        renderRatingTargetIdInput() {
          const topicRatingTargetId = this.get('topic.rating_target_id');
          const ratingTargetId = this.get('rating_target_id');
          if (topicRatingTargetId && ratingTargetId === undefined) {
            this.set('rating_target_id', topicRatingTargetId);
            this.set('showRatingTargetId', false);
            this.set('showRatingTargetId', true);
          }
        }
      });

      api.modifyClass('controller:composer', {
        actions: {
          save() {
            const showRating = this.get('model.showRating');
            const includeRating = this.get('model.includeRating');
            const rating = this.get('model.rating');

            if (showRating && includeRating && !rating) {
              return bootbox.alert(I18n.t("composer.select_rating"));
            }

            let result = this.save();

            if (result) {
              Promise.resolve(result).then(() => {
                if (showRating && includeRating && rating) {
                  const controller = this.get('topicController');
                  controller.toggleCanRate();
                }
              });
            };
          }
        },

        @observes('model.composeState')
        saveRatingAfterEditing() {
          // only continue if user was editing and composer is now closed
          if (!this.get('model.showRating')
             || this.get('model.action') !== Composer.EDIT
             || this.get('model.composeState') !== Composer.SAVING) { return; }

          const rating = this.get('model.rating');

          if (rating) {
            const post = this.get('model.post');
            const includeRating = this.get('model.includeRating');

            if (includeRating) {
              editRating(post.id, rating);
            } else {
              removeRating(post.id);
              const controller = this.get('topicController');
              controller.toggleCanRate();
            }
          }
        }
      });

      api.modifyClass('component:composer-body', {
        @observes('composer.showRating')
        resizeIfShowRating: function() {
          if (this.get('composer.composeState') === Composer.OPEN) {
            this.resize();
          }
        }
      });

      api.modifyClass('model:topic', {
        @computed('subtype','tags','category_id')
        ratingEnabled(type, tags, categoryId) {
          return ratingEnabled(type, tags, categoryId);
        },

        @computed('ratingEnabled')
        showRatingTip(enabled) {
          return enabled && this.siteSettings.rating_show_topic_tip;
        }
      });

      api.modifyClass('controller:topic', {
        refreshAfterTopicEdit: false,
        unsubscribed: false,

        unsubscribe() {
          const topicId = this.get('content.id');
          if (!topicId) return;
          const messageBus = this.messageBus;
          if (messageBus) {
            messageBus.unsubscribe('/topic/*');
            this.set('unsubscribed', true);
          }
        },

        @observes('unsubscribed', 'model.postStream')
        subscribeToRatingUpdates() {
          const unsubscribed = this.get('unsubscribed');
          const model = this.get('model');
          const subscribedTo = this.get('subscribedTo');

          if (!unsubscribed) return;
          this.set('unsubscribed', false);

          if (model && model.id === subscribedTo) return this.set('subscribedTo', null);
          this.set('subscribedTo', null);

          if (model && model.get('postStream') && model.rating_enabled) {
            const refresh = (args) => this.appEvents.trigger('post-stream:refresh', args);

            this.messageBus.subscribe("/topic/" + model.id, function(data) {
              if (data.type === 'revised') {
                if (data.average_rating !== undefined) {
                  model.set('average_rating', data.average_rating);
                }
                if (data.rating_count !== undefined) {
                  model.set('rating_count', data.rating_count);
                }
                if (data.post_id !== undefined) {
                  model.get('postStream').triggerChangedPost(data.post_id, data.updated_at).then(() =>
                    refresh({ id: data.post_id })
                  );
                }
              }
            });

            this.set('subscribedTo', model.id);
          }
        },

        @observes('editingTopic')
        refreshPostRatingVisibility() {
          if (!this.get('editingTopic') && this.get('refreshAfterTopicEdit')) {
           this.get('model.postStream').refresh();
           this.set('refreshAfterTopicEdit', false);
          }
        },

        toggleCanRate() {
          if (this.get('model')) {
            this.toggleProperty('model.can_rate');
          }
        }
      });
    });
  }
};
