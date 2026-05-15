const mongoose = require("mongoose");

const meetingSchema = mongoose.Schema({

   roomId:{
      type:String,
      required:true,
   },

   username:{
      type:String,
      required:true,
   },

   message:{
      type:String,
      default:"",
   },
   userId:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"User",
   required:true
},
imageUrl:{
   type:String,
}

   

},{
   timestamps:true
});

const Meeting =
   mongoose.model(
      "Meeting",
      meetingSchema
   );

module.exports = { Meeting };