var onRun = function(context) {
    
    var plugin_id = 'PLUGIN_TYPOGRAPHIC_SCALE'
    var pluginName = 'Typographic Scale ✍'
    var selection = context.selection
    var doc = context.document
    
    function warn(msg) {
        doc.showMessage_(pluginName + ' : ' + msg);
    }
    
    var numElements = selection.count();
    if (numElements == 0) {
        warn('Nothing selected.');
        return;
    } else if (numElements == 1 && selection[0].class() != MSTextLayer &&
        selection[0].class() != MSLayerGroup) {
        warn('Selected element is not of type TextLayer.');
        return;
    }
    
    var elements = [];
    var i;
    
    
    var enumerator, item, class_
    var layers, numLayers, item_
    
    enumerator = selection.objectEnumerator();
    while (item = enumerator.nextObject()) {
        class_ = item.class();
        if (class_ == MSTextLayer) {
            elements.push(item);
        } else if (class_ == MSLayerGroup) {
            //just 1st level
            layers = item.layers()
                .array();
            numLayers = layers.count();
            i = -1;
            while (++i < numLayers) {
                item_ = layers[i];
                if (item_.class() == MSTextLayer) {
                    elements.push(item_);
                }
            }
        }
    }
    numElements = elements.length;
    
    
    if (numElements == 0) {
        warn('None of the selected elements is or has children of type TextLayer.');
        return;
    }
    
    function MakeDict(objects, keys) {
        return NSDictionary.dictionaryWithObjects_forKeys(objects, keys);
    }
    
    var PRESET_KEY_ORDERED = {
        Scale: ['Minor Second',
        'Major Second',
        'Minor Third',
        'Major Third',
        'Perfect Fourth',
        'Augmented Fourth',
        'Perfect Fifth',
        'Golden Ratio'
        ],
        Range: ['x2', 'x4', 'x8'],
        All: ['Scale', 'Range', 'ReturnType', 'SuffixEm', 'SuffixPer']
    },
    PRESET = MakeDict(
        [MakeDict(
            [
                [0.772, 0.823, 0.878, 0.937, 1, 1.067, 1.138, 1.215, 1.296],
                [0.624, 0.702, 0.79, 0.889, 1, 1.125, 1.266, 1.424, 1.602],
                [0.482, 0.579, 0.694, 0.833, 1, 1.2, 1.44, 1.728, 2.074],
                [0.41, 0.512, 0.64, 0.8, 1, 1.25, 1.563, 1.953, 2.441],
                [0.317, 0.422, 0.563, 0.75, 1, 1.333, 1.777, 2.369, 3.157],
                [0.25, 0.354, 0.5, 0.707, 1, 1.414, 1.999, 2.879, 3.998],
                [0.198, 0.296, 0.444, 0.667, 1, 1.5, 2.25, 3.375, 5.063],
                [0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618, 4.236, 6.854]
            ],
            PRESET_KEY_ORDERED.Scale),
         MakeDict(
            [2, 4, 8],
            PRESET_KEY_ORDERED.Range), ['Float', 'Integer'], false, false
        ],
        PRESET_KEY_ORDERED.All
    );
    
    
    var defaults = NSUserDefaults.standardUserDefaults(),
    pluginValues;
    
    if (!defaults.objectForKey(plugin_id)) {
        defaults.setObject_forKey_(
            MakeDict(
                ['Major Third', 'x8', 'Float', false, false], ['Scale', 'Range', 'ReturnType', 'SuffixEm', 'SuffixPer']),
            plugin_id);
    }
    
    // mutableCopy nor NSMutableDictionary.dictionaryWithDictionary return a mutable copy
    // this will work for now
    pluginValues = NSMutableDictionary.alloc()
        .init();
    pluginValues.setDictionary_(defaults.objectForKey(plugin_id));
    
    var typeScale,
    typeScaleNum;
    var funcScale,
    funcSuffix;
    
    (function () {
        // TODO : do it the proper cocoa way
        var viewWidth = 270,
        viewHeight = 100,
        labelWidth = 80,
        compWidth = viewWidth - labelWidth,
        compWidth_2 = compWidth * 0.5;
        
        var view = NSView.alloc()
            .initWithFrame_(NSMakeRect(0, 0, viewWidth, viewHeight));
        
        function createLabel(x, y, name) {
            var label = NSTextField.alloc()
                .initWithFrame_(NSMakeRect(x, y, labelWidth, 25));
            label.setEditable_(false);
            label.setSelectable_(false);
            label.setBezeled_(false);
            label.setDrawsBackground_(false);
            label.setFont(NSFont.systemFontOfSize_(11));
            label.setStringValue_(name);
            return label;
        }
        
        function createSelect(x, y, width, values, initialState) {
            var select = NSPopUpButton.alloc()
                .initWithFrame_(NSMakeRect(x, y + 5, width, 25));
            select.addItemsWithTitles_(values);
            select.setFont(NSFont.systemFontOfSize_(11));
            select.selectItemWithTitle_(initialState);
            
            return select;
        }
        
        function createCheckBox(x, y, name, initialState) {
            var btn = NSButton.alloc()
                .initWithFrame_(NSMakeRect(x, y + 9, compWidth_2, 18));
            btn.setButtonType_(NSSwitchButton);
            btn.setState_(initialState || NSOffState);
            btn.setTitle_(name);
            return btn;
        }
        
        var offset = viewHeight - 32;
        
        var scaleLabel = createLabel(0, offset, 'Type Scale'),
        scaleSelect = createSelect(labelWidth, offset, 130, PRESET_KEY_ORDERED['Scale'], pluginValues['Scale']),
        rangeSelect = createSelect(labelWidth + 130, offset, 60, PRESET_KEY_ORDERED['Range'], pluginValues['Range']);
        
        offset -= 32;
        
        var returnLabel = createLabel(0, offset, 'Type Return'),
        returnSelect = createSelect(labelWidth, offset, compWidth, PRESET['ReturnType'], pluginValues['ReturnType']);
        
        offset -= 31;
        
        var suffixLabel = createLabel(0, offset, 'Layer Suffix'),
        suffixCheckEm = createCheckBox(labelWidth, offset, 'em', pluginValues['SuffixEm']),
        suffixCheckPer = createCheckBox(labelWidth + compWidth_2 - 25, offset, 'percentage', pluginValues['SuffixPer']);
        
        var alert = NSAlert.alloc()
            .init();
        alert.setMessageText_(pluginName);
        alert.setAccessoryView_(view);
        alert.addButtonWithTitle("OK")
        alert.addButtonWithTitle("Cancel")
        
        view.addSubview_(scaleLabel);
        view.addSubview_(scaleSelect);
        view.addSubview_(rangeSelect);
        view.addSubview_(returnLabel);
        view.addSubview_(returnSelect);
        view.addSubview_(suffixLabel);
        view.addSubview_(suffixCheckEm);
        view.addSubview_(suffixCheckPer);
        
        var buttonPressed = alert.runModal();
     
        if (buttonPressed == NSAlertSecondButtonReturn) {
            return
        }
     
        var scale_ = scaleSelect.titleOfSelectedItem(),
        range = rangeSelect.titleOfSelectedItem(),
        return_ = returnSelect.titleOfSelectedItem(),
        suffixEm = suffixCheckEm.state(),
        suffixPer = suffixCheckPer.state();
        
        pluginValues.setValue_forKey_(scale_, 'Scale');
        pluginValues.setValue_forKey_(range, 'Range');
        pluginValues.setValue_forKey_(return_, 'ReturnType');
        pluginValues.setValue_forKey_(suffixEm, 'SuffixEm');
        pluginValues.setValue_forKey_(suffixPer, 'SuffixPer');
        
        defaults.setObject_forKey_(
            pluginValues, plugin_id
        );
        defaults.synchronize();
        
        var isReturnTypeFloat = return_ == PRESET['ReturnType'][0];
        
        funcScale = new Function('base,scale', 'return ' + (isReturnTypeFloat ? 'base * scale' : '~~(base * scale + 0.5)'));
        funcSuffix = new Function('base,scale', 'return ' +
            (function () {
                var em, per;
                em = per = "'_' + ";
                if (isReturnTypeFloat) {
                    em += "scale + 'em'";
                    per += "scale * 100 + '%'"
                } else {
                    var val = "scale / base * 100";
                    em += val + "/ 100 + 'em'";
                    per += val + " + '%'";
                }
                return suffixEm && suffixPer ? (em + '+' + per) :
                    suffixEm ? em : suffixPer ? per :
                "''";
            })());
        
        
        range = PRESET['Range'][range];
        typeScale = PRESET['Scale'][scale_];
        
        var start = (typeScale.count() - 1) / 2 - range / 2,
        count = range + 1;
        
        typeScale = typeScale.subarrayWithRange_(NSMakeRange(start, count));
        typeScaleNum = typeScale.count();
    })();
    
    
    (function () {
        var element, baseScale, baseName, baseOffset, scale;
        var elements_, element_, elementScale_;
        var offset, frame;
        
        var j = -1;
        while (++j < numElements) {
            element = elements[j];
            
            baseScale = element.fontSize = funcScale(element.fontSize(), 1);
            baseName = element.name();
            baseOffset = element.frame()
                .y();
            
            elements_ = new Array(typeScaleNum);
            
            i = -1;
            while (++i < typeScaleNum) {
                scale = typeScale[i];
                
                element_ = element.duplicate();
                elementScale_ = element_.fontSize = funcScale(baseScale, scale);
                element_.setName(baseName + funcSuffix(baseScale, elementScale_));
                
                baseOffset -= scale >= 1 ? 0 : element_.frame()
                    .height();
                elements_[i] = element_;
            }
            
            offset = 0;
            i = -1;
            while (++i < typeScaleNum) {
                frame = elements_[i].frame();
                frame.y = baseOffset + offset;
                offset += frame.height();
            }
            
            element.parentGroup()
                .removeLayer(element);
        }
    })();
};
