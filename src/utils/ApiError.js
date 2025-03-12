class ApiError extends Error{
    constructor(
        statusCode,
        message="something want wrong",
        errors=[],
        statck=""
    ){
        super(message)
        this.statusCode=statusCode
        this.data=null
        this.errors=errors
        this.message=message
        this.success=false

        if(stack){
            this.stack=statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}