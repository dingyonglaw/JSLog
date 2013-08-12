/* JSLOG JavaScript Logging Library
 *
 * Copyright 2011, Jarod Law Ding Yong
 * Dual licensed under the MIT or GNU GPL Version 3 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Date: Thu Nov 11 19:04:53 2010 -0500
 */


var JSLog = (function () {
	
	var _util = (function () {
    
		var dataType = {
			'[object Boolean]'  : 'boolean',
			'[object Number]'   : 'number',
			'[object String]'   : 'string',
			'[object Function]' : 'function',
			'[object Array]'    : 'array',
			'[object Date]'     : 'date',
			'[object RegExp]'   : 'regExp',
			'[object Object]'   : 'object'
		};
		
		return {

			isPlainObject: function( obj ) {
				// Must be an Object.
				// Because of IE, we also have to check the presence of the constructor property.
				// Make sure that DOM nodes and window objects don't pass through, as well
				if ( !obj || 
					dataType[Object.prototype.toString.call(obj)] !== 'object' || 
					obj.nodeType || 
					(obj && typeof obj === "object" && "setInterval" in obj)) {
					
					return false;
				}
				
				// Not own constructor property must be Object
				if ( obj.constructor &&
					!Object.prototype.hasOwnProperty.call(obj, "constructor") &&
					!Object.prototype.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
					return false;
				}
				
				// Own properties are enumerated firstly, so to speed up,
				// if last one is own, then all properties are own.
			
				var key;
				for ( key in obj ) {}
				
				return key === undefined || Object.prototype.hasOwnProperty.call( obj, key );
			},
			
			isArray : function (obj) {
				return (obj == null ? String(obj) : dataType[Object.prototype.toString.call(obj)] || 'object') === 'array';
			},
			
			isFunction : function (obj) {
				return (obj == null ? String(obj) : dataType[Object.prototype.toString.call(obj)] || 'object') === 'function';
			},
			
			extend : function() {
				 var options, name, src, copy, copyIsArray, clone,
					target = arguments[0] || {},
					i = 1,
					length = arguments.length,
					deep = false;

				// Handle case when target is a string or something (possible in deep copy)
				if ( typeof target !== "object" && !this.isFunction(target) ) {
					target = {};
				}

				for ( ; i < length; i++ ) {
					// Only deal with non-null/undefined values
					if ( (options = arguments[ i ]) != null ) {
						// Extend the base object
						for ( name in options ) {
							src = target[ name ];
							copy = options[ name ];

							// Prevent never-ending loop
							if ( target === copy ) {
								continue;
							}

							// Recurse if we're merging plain objects or arrays
							if ( deep && copy && ( this.isPlainObject(copy) || (copyIsArray = this.isArray(copy)) ) ) {
								if ( copyIsArray ) {
									copyIsArray = false;
									clone = src && this.isArray(src) ? src : [];

								} else {
									clone = src && this.isPlainObject(src) ? src : {};
								}

								// Never move original objects, clone them
								target[ name ] = arguments.callee( deep, clone, copy );

							// Don't bring in undefined values
							} else if ( copy !== undefined ) {
								target[ name ] = copy;
							}
						}
					}
				}

				// Return the modified object
				return target;
			}
		}
	}());
	
    var thisProxy = this,

        fbcon = window.console,

        logLevel = 5,
        
        logFilter = {},

        logMethods = ['error', 'warn', 'info', 'debug', 'log'],
        
        // Passing methods
        originMethods = 'assert clear count dir dirxml exception group groupCollapsed groupEnd profile profileEnd table time timeEnd trace'.split(' '),

        hasLevel = function (level) {
            return logLevel > 0 ? logLevel > level : logMethods.length + logLevel <= level;
        },
        
        hasFilter = function (module) {
            return (!!logFilter[module]);
        },
        
        // Store list of loggers by module
        loggers = {},
        
        // global methods to be returned
        global = {},
        
        // list of global methods be to cloned to build module base logger
        globalFn = {},
        
        idx = originMethods.length;
        
    // Global logs
    global.Logs = {};

    // Global set level
    global.SetLevel = function (level) {
        logLevel = (typeof level === 'number') ? level : 5;
    };
    
    global.GetLevel = function () {
        return logLevel;
    };
    
    global.SetFilter = function (module) {

        if (!!module && typeof module === 'string') {
        
            module = module.split(' ');
            
            var idx = module.length;
            
            while (--idx >= 0) {
                
                logFilter[module] = true;
            }
            
            return logFilter;
        }
            
        return false;
    };
    
    global.UnsetFilter = function (module) {
        
        if (!!module && typeof module === 'string') {
        
            module = module.split(' ');
            
            var idx = module.length;
            
            while (--idx >= 0) {
                
                if (!!logFilter[module])
                    delete logFilter[module];
            }
            
            return logFilter;
        }
            
        return false;
    };
    
    global.GetFilter = function () {
        return logFilter;
    };
    
    // Build global origin methods, 
    // to be cloned to build module logger
    while (--idx >= 0) {
        (function (method) {

            globalFn[method] = function () {
                logLevel !== 0 && fbcon && fbcon[method] && fbcon[method].apply(fbcon, arguments);
            };

        })(originMethods[idx]);
    }
    
    // Build global logging methods, 
    // to be used during Dump or shorthand non-module
    idx = logMethods.length;
    while (--idx >= 0) {
        (function (idx, fn) {

            globalFn[fn] = function () {
                
                var args = Array.prototype.slice.call(arguments);
                
                if (!fbcon || !hasLevel(idx)) {
                    return;
                }
                
                (fbcon.firebug || fbcon.firebuglite) ? fbcon[fn].apply(thisProxy, args) : fbcon[fn] ? fbcon[fn](args) : fbcon.log(args);
            };

        })(idx, logMethods[idx]);
    }

    // Private Module Logger Builder
    var _Build = function (module) {
        
        var idx = logMethods.length,
             methods = {};
        
        while (--idx >= 0) {
            (function (idx, fn) {

                methods[fn] = function () {
                    
                    var args = Array.prototype.slice.call(arguments);
                    
                    global.Logs[this.module].push([fn].concat(args));

                    if (!fbcon || !hasLevel(idx) || hasFilter(this.module)) {
                        return;
                    }
                    
                    args.unshift('[' + this.module + ']');
                    (fbcon.firebug || fbcon.firebuglite) ? fbcon[fn].apply(thisProxy, args) : fbcon[fn] ? fbcon[fn](args) : fbcon.log(args);
                };

            })(idx, logMethods[idx]);
        }
        
        return methods;
    };
    
    global.Register = function (module) {
        
        if (!!loggers[module])
            return loggers[module];

        global.Logs[module] = [];
        loggers[module] = _util.extend({}, globalFn, _Build());
        loggers[module].module = module;
        
        return loggers[module];
    };
    
    global.GetModule = function (module) {
        if (!!loggers[module])
            return loggers[module];
            
        return false;
    };
    
    global.Dump = function (module) {
        if (!!module && !!loggers[module]) {
        
            var logs = global.Logs[module];
        
            globalFn.groupCollapsed(module);

            for (var i = 0, len = logs.length; i < len; i++) {
                
               globalFn[logs[i].slice(0,1)].apply(thisProxy, logs[i].slice(1));
            }
        
            globalFn.groupEnd();
        }
        else {
            
            globalFn.groupCollapsed('Loggers Dump');
            
            for (var mod in loggers) {
                if (loggers.hasOwnProperty(mod)) {
                    global.Dump(mod);
                }
            }
            
            globalFn.groupEnd();
        }
    };

    _util.extend(global, globalFn);
    
    return global;
}());

