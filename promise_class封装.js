//IIFE模块化封装Promise（ES6基于class关键字）
(function (window) {
  //将所有状态保存成全局变量，防止后面拼写出错
  const Pending = "pending";
  const Resolved = "resolved";
  const Rejected = "rejected";
  //---------------------------定义构造函数开始------------------------------
  class Promise {
    constructor(excutor) {
      //1 将this存起来，防止后面乱变
      const that = this;

      //2 属性
      //2.1 每个promise对象，初始状态为pending
      that.status = Pending;
      //2.2 每个promise对象传递的value/reason
      that.data = undefined;
      //2.3 当回调函数在p对象状态改变之前定义时，先将.then的两个回调函数存成对象，作为callbacks数组的元素之一
      that.callbacks = [];

      //3 定义两个内部函数resolve和reject，后续作为excutor的实参传入

      //3.1 定义resolve函数
      function resolve(value) {
        //一旦执行此函数，立即将pending转为resolved，若状态已改变就不执行了
        if (that.status != Pending) {
          return;
        } else {
          //3.1.1  改状态
          that.status = Resolved;

          //3.1.2  改当前promise对象的data值
          that.data = value;

          //3.1.3  看看改状态之前有没有提前定义好的.then()回调
          if (that.callbacks.length != 0) {
            //若有，立刻从callbacks数组中拿出来，异步执行所有onresolved回调
            setTimeout(() => {
              that.callbacks.forEach((item) => {
                item.onresolved(that.data);
              });
            });
          }
        }
      }

      //3.2 定义reject函数
      function reject(reason) {
        //一旦执行此函数，立即将pending转为rejected，若状态已改变就不执行了
        if (that.status != Pending) {
          return;
        } else {
          //3.2.1  改状态
          that.status = Rejected;

          //3.2.2  改当前promise对象的data值
          that.data = reason;

          //3.2.3  看看改状态之前有没有提前定义好的.then()回调
          if (that.callbacks.length != 0) {
            //若有，立刻从callbacks数组中拿出来，异步执行所有onrejected回调
            setTimeout(() => {
              that.callbacks.forEach((item) => {
                item.onrejected(that.data);
              });
            });
          }
        }
      }
      //4  将定义的两个函数作为实参，立即同步试着执行excutor函数
      try {
        excutor(resolve, reject);
      } catch (err) {
        //4.1  若执行出错，直接把错误传入，执行reject函数
        reject(err);
      }
    }
    //---------------------------定义构造函数结束------------------------------

    //--------------------------定义.then()方法开始----------------------------
    then(onresolved, onrejected) {
      //1  保存this
      const that = this;

      //2  确认两个参数是函数，若不是，则将value返回/将其reason抛错，改写成函数
      onresolved =
        typeof onresolved === "function" ? onresolved : (value) => value;
      onrejected =
        typeof onrejected === "function"
          ? onrejected
          : (reason) => {
              throw reason;
            };

      //3  返回一个新的promise实例对象
      return new Promise((resolve, reject) => {
        //执行.then()的参数onResolved/onRejected回调函数，以此结果作为newP的结果

        //3.1  将所有对其参数的处理封装为一个函数
        function handleCallback(callback) {
          //3.1.1  试着执行回调
          try {
            //将回调函数执行后的返回值保存起来
            const result = callback(that.data);
            //3.1.2  分三种情况，判断newP的结果
            if (result instanceof Promise) {
              //情况1：result是一个promise
              //执行此promise的then方法，result的结果就是newP的结果
              //所以直接将newP的resolve或reject这两个内部函数作为两个回调参数就行~
              result.then(resolve, reject);
            } else {
              //情况2：result不是一个promise，newP直接成功，result作为value，执行resolve
              resolve(result);
            }
          } catch (err) {
            //情况3：执行回调的时候报错，newP直接失败，错误作为reason，执行reject
            reject(err);
          }
        }

        //3.2  根据promise对象的状态，异步执行回调/保存回调

        //3.2.1  promise对象为成功
        if (that.status === Resolved) {
          setTimeout(() => {
            handleCallback(onresolved);
          });
        }

        //3.2.2  promise对象失败
        if (that.status === Rejected) {
          setTimeout(() => {
            handleCallback(onrejected);
          });
        }

        //3.2.3  promise状态未改变
        if (that.status === Pending) {
          //① 把两个回调函数封装成一个对象
          var callbackObj = {
            onresolved(value) {
              handleCallback(onresolved);
            },
            onrejected(reason) {
              handleCallback(onrejected);
            },
          };
          //②把回调函数对象存起来，等状态一改变就立即执行
          that.callbacks.push(callbackObj);
        }
      });
    }
    //--------------------------定义.then()方法结束----------------------------

    //---------------------------定义.catch()方法------------------------------
    catch(onrejected) {
      return this.then(undefined, onrejected);
    }

    //------------------------定义Promise函数对象方法----------------------------
    //--------方法一：Promise.resolve--------
    static resolve = function (value) {
      return new Promise((resolve, reject) => {
        if (value instanceof Promise) {
          //情况1：value是一个promise对象，返回的p以value对象的结果为结果
          value.then(resolve, reject);
        } else {
          //情况2：value不是一个promise对象，直接返回一个成功的promise对象
          resolve(value);
        }
      });
    };

    //--------方法二：Promise.reject--------
    static reject = function (reason) {
      // 不考虑reason是不是promise，直接返回一个失败的promise
      return new Promise((resolve, reject) => {
        reject(reason);
      });
    };

    //--------方法三：Promise.all--------
    static all = function (promises) {
      //参数为一个全是promise对象的数组

      //1  定义一个存放对应promise执行结果的数组
      const values = new Array(promises.length);

      //2  对成功的promise进行计数
      var count = 0;

      //3  该方法返回一个新的promise对象
      return new Promise((resolve, reject) => {
        //3.1  遍历promises数组里的所有promise对象，将其作为Promise.resolve()方法的参数，其返回的promise对象就是p的结果
        promises.forEach((p, index) => {
          Promise.resolve(p).then(
            (value) => {
              //情况1：p成功了

              //1-1  成功的计数+1
              count++;
              //1-2  newP的成功返回数组，与p对应的下标元素的值设为p的成功值
              values[index] = value;
              //1-3  判断是不是全成功了，若是，把newP给搞成功
              if (count === promises.length) {
                resolve(values);
              }
            },

            (reason) => {
              //情况2：p失败了，那newP就立即失败
              reject(reason);
            }
          );
        });
      });
    };

    //--------方法四：Promise.race--------
    static race = function (promises) {
      //返回一个newP
      return new Promise((resolve, reject) => {
        //遍历promises中的promise对象，拿到结果
        promises.forEach((p) => {
          Promise.resolve(p).then(
            //以第一个有结果的p的结果为准
            (value) => {
              //情况1： p成功了，newP直接成功
              resolve(value);
            },
            (reason) => {
              //情况2： p失败了，newP直接失败
              reject(reason);
            }
          );
        });
      });
    };
  }

  //把Promise暴露出去
  window.Promise = Promise;
})(window);
//------------------------------完结撒花！！！----------------------------------
