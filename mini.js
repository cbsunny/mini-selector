var mini = (function(){
    
    var snack = /(?:[\w\-\\.#]+)+(?:\[\w+?=([\'"])?(?:\\\1|.)+?\1\])?|\*|>/ig,
        exprClassName = /^(?:[\w\-_]+)?\.([\w\-_]+)/,
        exprId = /^(?:[\w\-_]+)?#([\w\-_]+)/,
        exprNodeName = /^([\w\*\-_]+)/,
        na = [null,null];
    
    function _find(selector, context) {
        /**
         * This is what you call via x()
         * Starts everything off...
         */
        
        context = context || document;

        var simple = /^[\w\-_#]+$/.test(selector); // 检测是不是id
        // 如果不是简单类型的选择器，则在上下文中查找
        // if (!simple && context.querySelectorAll) {
            // realArray将返回值转成真正的数组
        //     return realArray(context.querySelectorAll(selector));
        // }
        // 如果querySelector不存在的情况
        // 如果包含,号分割的选择器
        if (selector.indexOf(',') > -1) {
            var split = selector.split(/,/g), ret = [], sIndex = 0, len = split.length;
            for(; sIndex < len; ++sIndex) {
                // 拆解逗号分割的选择器，_find()计算出每部分的NodeList，再拼接组合成数组
                ret = ret.concat( _find(split[sIndex], context) );
            }
            // unique函数确保没有重复DOM元素存在数组里
            return unique(ret);
        }
        // 如果不包含逗号开始正式查找dom
        // 把selector各个部分分离出来，拆解为数组['#xxx','.xxx','tag','*','>'], snack部分还不够理解？
        var parts = selector.match(snack),
            // 取出数组里最后一个元素进行分析，由于mini库支持的查询方式有限，能确保在后面的片段一定是前面片段的子元素，例如"#a div"，div就是#a的子元素 "#a > p" p是#a的直接子元素
            // 先把匹配最后一个查询片段的dom元素找出来，再进行父类过滤，就能找出满足整句查询语句的dom元素
            part = parts.pop(),
            // 如果该部分是个id，则匹配出来返回，否则返回null
            id = (part.match(exprId) || na)[1],
            // 如果不是id，则去匹配exprClassName, 如果是class类选择器，则返回，否则返回null
            className = !id && (part.match(exprClassName) || na)[1],
            // 如果node类型则返回，否则返回null
            nodeName = !id && (part.match(exprNodeName) || na)[1],
            collection;
        // 如果此片段是个class类型，且浏览器支持DOM的getElementsByClassName
        if (className && !nodeName && context.getElementsByClassName) {
            // 收集此类型的nodelist
            collection = realArray(context.getElementsByClassName(className));
            
        } else {
            // 不是id的情况下收集node类型或‘*‘的所有nodelist
            collection = !id && realArray(context.getElementsByTagName(nodeName || '*'));
            // 如果此片段是class类型，经过上面的步骤collection就储存了页面所有元素，把它传进下面定义的filterByAttr函数，找出符合class="className"的元素
            if (className) {
                collection = filterByAttr(collection, 'className', RegExp('(^|\\s)' + className + '(\\s|$)'));
            }
            
            if (id) {
                var byId = context.getElementById(id);
                return byId?[byId]:[];
            }
        }
        // 如果还有父层需要过滤则去过滤父层，collection[0]表示其自片段是否有nodelist
        return parts[0] && collection[0] ? filterParents(parts, collection) : collection;
        
    }
    
    function realArray(c) {
        
        /**
         * Transforms a node collection into
         * a real array
         */
        
        try {
            return Array.prototype.slice.call(c);
        } catch(e) {
            var ret = [], i = 0, len = c.length;
            for (; i < len; ++i) {
                ret[i] = c[i];
            }
            return ret;
        }
        
    }
    
    function filterParents(selectorParts, collection, direct) {
        
        /**
         * This is where the magic happens.
         * Parents are stepped through (upwards) to
         * see if they comply with the selector.
         */
        
        var parentSelector = selectorParts.pop();
        
        if (parentSelector === '>') {
            return filterParents(selectorParts, collection, true);
        }
        
        var ret = [],
            r = -1,
            id = (parentSelector.match(exprId) || na)[1],
            className = !id && (parentSelector.match(exprClassName) || na)[1],
            nodeName = !id && (parentSelector.match(exprNodeName) || na)[1],// id不存在
            cIndex = -1,
            node, parent,
            matches;
            
        nodeName = nodeName && nodeName.toLowerCase();
            
        while ( (node = collection[++cIndex]) ) {
            
            parent = node.parentNode;
            
            do {
                // 感觉做法还是很值得学习，可以判断到每个条件，如果匹配该条件，判断是否符合，若不符合，直接跳出条件匹配；如果不符合该条件接着往下匹配。
                // 继续进行的条件
                // 不是个node类型节点
                // 是个 * 类型 
                // node类型，不为*，与直接父层nodeName相同
                matches = !nodeName || nodeName === '*' || nodeName === parent.nodeName.toLowerCase();
                // 是id类型时，判断是否和直接父层id相同
                matches = matches && (!id || parent.id === id);
                // 是className时，判断是否直接父层class相同
                matches = matches && (!className || RegExp('(^|\\s)' + className + '(\\s|$)').test(parent.className));
                
                if (direct || matches) { break; }
                
            } while ( (parent = parent.parentNode) );// 貌似刚知道可以这样 while里赋值表达式 先赋值后判断
            
            if (matches) {
                ret[++r] = node;
            }
        }
        
        return selectorParts[0] && ret[0] ? filterParents(selectorParts, ret) : ret;
        
    }
    
    
    var unique = (function(){
        
        var uid = +new Date(); 
                
        var data = (function(){
         
            var n = 1;
         
            return function(elem) {
                var cacheIndex = elem[uid],
                    nextCacheIndex = n++;
         
                if(!cacheIndex) {
                    elem[uid] = nextCacheIndex;
                    return true;
                }
         
                return false;
         
            };
         
        })();
        
        return function(arr) {
        
            /**
             * Returns a unique array
             */
            
            var length = arr.length,
                ret = [],
                r = -1,
                i = 0,
                item;
            //遍历每个元素传进data()增加标志，判断是否有重复元素，重复了就跳过，不重复就赋给ret数组    
            for (; i < length; ++i) {
                item = arr[i];
                if (data(item)) {
                    ret[++r] = item;
                }
            }
            
            uid += 1;
            
            return ret;
    
        };
    
    })();
    
    function filterByAttr(collection, attr, regex) {
        
        /**
         * Filters a collection by an attribute.
         */
        
        var i = -1, node, r = -1, ret = [];
        
        while ( (node = collection[++i]) ) {
            if (regex.test(node[attr])) {
                ret[++r] = node;
            }
        }
        
        return ret;
    }
    
    return _find;
    // 暴露到外面的唯一接口
})();