from fastapi import APIRouter
from .register import router as register_router
from .login import router as login_router

router = APIRouter()
router.include_router(register_router, prefix="", tags=["auth"])
router.include_router(login_router, prefix="", tags=["auth"])