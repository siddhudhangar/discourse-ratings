class DiscourseRatings::RatingController < ::ApplicationController

  def rate
    params.require(:post_id)
    params.require(:rating)

    post = Post.find(params[:post_id].to_i)
    post.custom_fields["rating"] = params[:rating].to_i
    post.custom_fields["rating_weight"] = 1
    post.save_custom_fields(true)

    RatingsHelper.handle_rating_update(post)

    render json: success_json
  end

  def remove
    params.require(:post_id)

    id = params[:post_id].to_i
    post = Post.find(id)
    PostCustomField.where(post_id: id, name: "rating").destroy_all
    PostCustomField.where(post_id: id, name: "rating_weight").destroy_all

    RatingsHelper.handle_rating_update(post)

    render json: success_json
  end

  def getBadges
    if request.xhr?
      # respond to Ajax request
      sql = "select * from user_badges where post_id=%{post_id}" % {post_id:params[:post_id].to_i}
      records_array = ActiveRecord::Base.connection.exec_query(sql)
      json_data = {}
      total_posts = records_array.count.to_i
      count = 0
      if records_array.count > 0
        records_array.each do |row|
          badge_id = row["badge_id"]
          count = count + 1
          json_data["total_posts"]=total_posts
          badge_query = "select * from badges where id=%{badge_id}" % {badge_id:badge_id}
          records_array = ActiveRecord::Base.connection.exec_query(badge_query)
          if records_array.count > 0
            records_array.each do |row|
              # puts row
              json_data[count]=row
            
            end
          end
        end
        # puts json_data
        # json_data["post_id"]=params[:post_id].to_i
        render json: json_data
      else
        return false
      end
    else
      puts "normal request"
    end

    
  end

end
