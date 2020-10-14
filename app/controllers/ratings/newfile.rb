class HashTree < Hash
def initialize
  super do |hash, key|
    hash[key] = HashTree.new
  end
end
end

class DiscourseRatings::NewfileController < ::ApplicationController
  #before_action :check_types_exist
  skip_before_action :check_xhr, only: [:getbadges,:badges_info]

  def getbadges
    # puts "aaaaaaaaaaaaaaaaaaaaaa"
    # puts params[:post_id]
    if true
      # respond to Ajax request
      # puts "ppppppppppppp"
      sql = "select * from user_badges where post_id=%{post_id}" % {post_id:params[:post_id].to_i}
      # puts sql
      records_array = ActiveRecord::Base.connection.exec_query(sql)
      json_data = {}
      total_posts = records_array.count.to_i
      count = 0
      # puts records_array
      # puts records_array.count
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
        # puts "fffffffffffffffffffffff"
        #return false
        render :json => {:name => "any name"}
      end
    else
      # puts "normal request"
    end 
  end

  def badges_info
    json_data = HashTree.new

    params[:post_ids].split(',') do |post_id|
      puts post_id
      sql = "select * from user_badges where post_id=%{post_id}" % {post_id:post_id.to_i}
      records_array = ActiveRecord::Base.connection.exec_query(sql)
      total_posts = records_array.count.to_i
      if records_array.count > 0
        count = 0
        records_array.each do |row|
          badge_id = row["badge_id"]
          badge_query = "select * from badges where id=%{badge_id}" % {badge_id:badge_id}
          records_array = ActiveRecord::Base.connection.exec_query(badge_query)

          if records_array.count > 0
            records_array.each do |row|
              count = count + 1
              json_data[post_id][count] = row
            end
          end
        end
      end
    end
    render json: json_data
  end
end