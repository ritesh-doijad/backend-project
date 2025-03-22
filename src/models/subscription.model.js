
import mongoose ,{Schema} from "mongoose";


const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,//who is subcribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,//once who to subscribing
        ref:"User"
    }
},{
    timestamps:true
})


export const Subcription=mongoose.model("Subcription",subscriptionSchema)