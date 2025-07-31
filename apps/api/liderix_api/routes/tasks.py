from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
from liderix_api.models.tasks import Task
from liderix_api.schemas.tasks import TaskRead, TaskCreate, TaskUpdate
from liderix_api.db import get_async_session
from liderix_api.services.auth import get_current_user
from liderix_api.models.users import User

router = APIRouter(tags=["Tasks"])  # Убрал prefix, чтобы избежать дублирования

# 🔹 Получить все задачи текущего пользователя
@router.get("/tasks", response_model=list[TaskRead])
async def get_tasks(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    result = await session.execute(
        select(Task).where(Task.user_id == current_user.id)
    )
    return result.scalars().all()

# 🔹 Получить задачу по ID
@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    task = await session.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# 🔹 Создать новую задачу
@router.post("/tasks", response_model=TaskRead)
async def create_task(
    data: TaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    new_task = Task(
        **data.dict(),
        user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)
    return new_task

# 🔹 Обновить задачу
@router.put("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    task = await session.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(task, field, value)
    await session.commit()
    await session.refresh(task)
    return task

# 🔹 Удалить задачу
@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    task = await session.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.delete(task)
    await session.commit()
    return {"detail": "Task deleted"}