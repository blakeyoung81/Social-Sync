# 🔍 **DEBUGGING METHODOLOGY: Multi-Pathway Processing Systems**

## **Problem Identification Process**

### **1. Recognize Multiple Execution Pathways**
When a feature works in one context but fails in another, immediately suspect **multiple execution pathways**:

- **Direct Script Execution** (working) vs **Web Interface API** (broken)
- **Development Environment** vs **Production Environment**  
- **Local Processing** vs **Remote Processing**

### **2. Trace Parameter Flow**
Follow parameters through the entire chain:
```
Web UI → API Route → Python Script → Core Function
```

**Key Investigation Points:**
- Parameter name mismatches (`frameStyle` vs `frame_style`)
- Missing parameter forwarding
- Default value overrides
- Type conversions (string vs int)

### **3. Compare Working vs Broken Pathways**
```bash
# Test both pathways with identical parameters
python script.py --frame-style rainbow --subtitle-font-size 8
# vs
curl -X POST /api/process-videos-stream -d '{"frameStyle":"rainbow","subtitleFontSize":8}'
```

### **4. Systematic Parameter Validation**
1. **Check argument parsing** in CLI script
2. **Check parameter destructuring** in API route  
3. **Check function signatures** for missing parameters
4. **Check function calls** for missing parameter passing

## **The Specific Fix Applied**

### **Root Cause**
```python
# ❌ BROKEN: Parameter defined but never passed
parser.add_argument('--frame-style', default='rainbow')  # ✅ Defined
# ... later ...
result = core_process_video(
    frame_style=args.frame_style  # ❌ MISSING!
)
```

### **Solution**
```python
# ✅ FIXED: Parameter properly forwarded
result = core_process_video(
    frame_style=args.frame_style,  # ✅ Added
    subtitle_font_size=args.subtitle_font_size,
    # ... other parameters
)
```

## **Debugging Tools Used**

1. **Parameter Tracing**: `grep -r "frame_style" src/`
2. **Function Signature Comparison**: Check CLI args vs function parameters
3. **API Route Validation**: Verify parameter destructuring
4. **Execution Path Testing**: Test both pathways independently

## **Prevention Strategies**

1. **Parameter Validation Tests**
2. **End-to-End Integration Tests**  
3. **Parameter Documentation** (required vs optional)
4. **Consistent Naming Conventions** across all layers

---
*This methodology successfully identified that `frame_style` was defined as a CLI argument but never passed to the core processing function, causing the web interface pathway to fail while direct script execution worked.* 