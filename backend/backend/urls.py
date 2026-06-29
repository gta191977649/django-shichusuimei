from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from suimei.views import BunsekiView, CreateUserView, CurrentUserView, PrecisionFlowView, SuimeiView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from suimei.data_api import MeishikiViewSet, WikiViewSet, AIViewSet, BunsekiViewSet

router = DefaultRouter()
router.register(r'meishiki', MeishikiViewSet, basename='meishiki')
router.register(r'bunseki', BunsekiViewSet, basename='bunseki')
router.register(r'wiki', WikiViewSet, basename='wiki')
router.register(r'ai', AIViewSet, basename='ai')


urlpatterns = [
    # Serve the React application's index.html file on the root URL
    path('', TemplateView.as_view(template_name='index.html')),

    # Django admin interface
    path('admin/', admin.site.urls),

    # User registration and authentication
    path("api/user/register/", CreateUserView.as_view(), name="register"),
    path("api/me", CurrentUserView.as_view(), name="current-user"),
    path("api/token/", TokenObtainPairView.as_view(), name="get_token"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("api-auth/", include("rest_framework.urls")),

    # Application-specific API endpoints
    path("api/query", SuimeiView.as_view(), name="query"),
    path("api/precision-flow", PrecisionFlowView.as_view(), name="precision-flow"),
    path("api/gpt", BunsekiView.as_view(), name="query"),

    path('api/', include(router.urls)),

]
