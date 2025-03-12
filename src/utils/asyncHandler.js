const asyncHandler = (requestHandler) => {
 return  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
export { asyncHandler };


// const asyncHandler=(fn)=>async(req,res,nest)=>{
//  try {
//     await fn(req,res,nest)
//  } catch (error) {
//     res.status(err.code || 500).json({
//         sucess:false,
//         message:err.message
//     })
//  }
// }