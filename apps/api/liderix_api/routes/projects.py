from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime

from liderix_api.models.projects import Project
from liderix_api.schemas.projects import ProjectCreate, ProjectUpdate, ProjectRead
from liderix_api.db import get_async_session
from liderix_api.services.auth import get_current_user
from liderix_api.models.users import User

router = APIRouter(prefix="/projects", tags=["Projects"])

# 🔹 Получить все проекты текущего пользователя
@router.get("/", response_model=list[ProjectRead])
async def get_projects(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    result = await session.execute(
        select(Project).where(Project.user_id == current_user.id)
    )
    return result.scalars().all()

# 🔹 Получить проект по ID
@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    project = await session.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# 🔹 Создать новый проект
@router.post("/", response_model=ProjectRead)
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    new_project = Project(
        **data.dict(),
        user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    session.add(new_project)
    await session.commit()
    await session.refresh(new_project)
    return new_project

# 🔹 Обновить проект
@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    project = await session.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(project, field, value)

    await session.commit()
    await session.refresh(project)
    return project

# 🔹 Удалить проект
@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    project = await session.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    await session.delete(project)
    await session.commit()
    return {"detail": "Project deleted"}