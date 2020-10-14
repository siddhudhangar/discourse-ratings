DiscourseRatings::Engine.routes.draw do
  get "/getbadges/:post_id" => "newfile#getbadges"
  get "/badges_info/:post_ids" => "newfile#badges_info"
  scope constraints: AdminConstraint.new do
    resources :rating_type, param: :type, :path => '/rating-type'
    resources :object, param: :type
    post "/rating/migrate" => "rating#migrate"
    delete "/rating/:type" => "rating#destroy"
  end
end

Discourse::Application.routes.append do
  get '/admin/plugins/ratings' => 'admin/plugins#index', constraints: AdminConstraint.new
  mount ::DiscourseRatings::Engine, at: "ratings"
end