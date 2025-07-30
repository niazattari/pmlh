const commentModel = require('../models/commentModel')

const allComments =async (req, res) =>{
  const { page = 1, limit = 5 } = req.query;
  const offset = (page-1)*limit;

        try{
            const comments = [
                {
                    $lookup:{
                        from: 'posts',
                        localField: 'postId',
                        foreignField: '_id',
                        as: 'post'
                    }
                },
                {
                    $unwind: '$post'
                },
                {
                    $addFields:{
                        formattedDate:{
                            $dateToString: {
                                format:'%d-%m-%Y',
                                date: "$date",
                            }
                        }
                    }
                },
                {$sort:{date:-1}}
            ]
            const options = {
            page: parseInt(page || 1),  
            limit: parseInt(limit || 10),
            } 
            const result = await commentModel.aggregatePaginate(comments, options)
            return res.render('admin/comments', {
                comments:result.docs,
                currentPage : result.page,
                totalPages : result.totalPages,
                limit: result.limit,offset})
        }catch(err){
            console.log(err)
        }
}

const viewComment =async (req, res) =>{
    const comment =await commentModel.find({})
    try {
        const comment = await commentModel.findById({_id:req.params.id}); 
        if (!comment) {
            return res.send('Comment not found'); 
        }
       return res.render('admin/view-comment', { comment }); 
    } catch (error) {
        res.send(error.message);
    }

}
const editComment =async (req, res) =>{
    const comment = await commentModel.findById({_id:req.params.id})    
    return res.render('admin/update-comment', {comment})
}

const updateComment = async (req, res) =>{
    try {
        const {description} = req.body
        const comment = await commentModel.findByIdAndUpdate(req.params.id, { description }, { new: true });
        return res.redirect('/admin/comments');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error updating comment');
    }
    
}


const deleteComment =async (req,res) =>{
    try {
        const { name, email, description} = req.body
        await commentModel.findByIdAndDelete(req.params.id, {name, email, description})
        return res.redirect('/admin/comments')
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error delete comment');
    }
}

module.exports = {allComments, viewComment ,editComment, updateComment, deleteComment}