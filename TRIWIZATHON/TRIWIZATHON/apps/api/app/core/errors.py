from fastapi import Request
from fastapi.responses import JSONResponse


async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc), "code": "internal_error"})


def error_response(message: str, code: str, status: int = 400, errors=None):
    from fastapi.responses import JSONResponse

    content = {"detail": message, "code": code}
    if errors:
        content["errors"] = errors
    return JSONResponse(status_code=status, content=content)
