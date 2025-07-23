class JavaScriptAnalyzer {
    constructor() {
        this.metrics = {};
        this.issues = [];
        this.suggestions = [];
        this.complexity = {};
        this.dependencies = new Set();
        this.functions = [];
        this.classes = [];
        this.variables = [];
    }

    // Main analysis method
    analyze(code) {
        this.reset();
        
        try {
            // Remove comments and strings for analysis
            const cleanCode = this.cleanCode(code);
            
            // Basic metrics
            this.calculateBasicMetrics(code, cleanCode);
            
            // Complexity analysis
            this.calculateComplexity(cleanCode);
            
            // Function analysis
            this.analyzeFunctions(cleanCode);
            
            // Class analysis
            this.analyzeClasses(cleanCode);
            
            // Variable analysis
            this.analyzeVariables(cleanCode);
            
            // Dependency analysis
            this.analyzeDependencies(cleanCode);
            
            // Code quality checks
            this.checkCodeQuality(code, cleanCode);
            
            // Generate report
            const report = this.generateReport();
            
            console.log('📊 Code Analysis Complete!');
            return report;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            return { error: error.message };
        }
    }

    // Reset analyzer state
    reset() {
        this.metrics = {};
        this.issues = [];
        this.suggestions = [];
        this.complexity = {};
        this.dependencies = new Set();
        this.functions = [];
        this.classes = [];
        this.variables = [];
    }

    // Remove comments and string literals for cleaner analysis
    cleanCode(code) {
        let cleaned = code;
        
        // Remove single-line comments
        cleaned = cleaned.replace(/\/\/.*$/gm, '');
        
        // Remove multi-line comments
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Remove string literals (simplified)
        cleaned = cleaned.replace(/'[^']*'/g, "''");
        cleaned = cleaned.replace(/"[^"]*"/g, '""');
        cleaned = cleaned.replace(/`[^`]*`/g, '``');
        
        return cleaned;
    }

    // Calculate basic code metrics
    calculateBasicMetrics(originalCode, cleanCode) {
        const lines = originalCode.split('\n');
        const cleanLines = cleanCode.split('\n');
        
        this.metrics = {
            totalLines: lines.length,
            codeLines: cleanLines.filter(line => line.trim().length > 0).length,
            commentLines: this.countCommentLines(originalCode),
            blankLines: lines.filter(line => line.trim().length === 0).length,
            characters: originalCode.length,
            charactersNoSpaces: originalCode.replace(/\s/g, '').length,
            averageLineLength: Math.round(originalCode.length / lines.length),
            longestLine: Math.max(...lines.map(line => line.length))
        };
        
        // Calculate comment ratio
        this.metrics.commentRatio = this.metrics.totalLines > 0 ? 
            (this.metrics.commentLines / this.metrics.totalLines * 100).toFixed(2) : 0;
    }

    // Count comment lines
    countCommentLines(code) {
        let count = 0;
        const lines = code.split('\n');
        let inMultiLineComment = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (inMultiLineComment) {
                count++;
                if (trimmed.includes('*/')) {
                    inMultiLineComment = false;
                }
            } else if (trimmed.startsWith('//')) {
                count++;
            } else if (trimmed.includes('/*')) {
                count++;
                if (!trimmed.includes('*/')) {
                    inMultiLineComment = true;
                }
            }
        }
        
        return count;
    }

    // Calculate cyclomatic complexity
    calculateComplexity(code) {
        // Complexity keywords that add branches
        const complexityKeywords = [
            'if', 'else if', 'while', 'for', 'do', 'switch', 'case',
            'catch', 'throw', '&&', '||', '?', 'break', 'continue'
        ];
        
        let complexity = 1; // Base complexity
        let conditionalNesting = 0;
        let maxNesting = 0;
        
        // Count complexity contributors
        for (const keyword of complexityKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            const matches = code.match(regex);
            if (matches) {
                if (keyword === '&&' || keyword === '||') {
                    complexity += matches.length;
                } else if (keyword === '?') {
                    complexity += matches.length;
                } else {
                    complexity += matches.length;
                }
            }
        }
        
        // Calculate nesting depth
        const lines = code.split('\n');
        for (const line of lines) {
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            conditionalNesting += openBraces - closeBraces;
            maxNesting = Math.max(maxNesting, conditionalNesting);
        }
        
        this.complexity = {
            cyclomatic: complexity,
            maxNesting: maxNesting,
            rating: this.getComplexityRating(complexity)
        };
    }

    // Get complexity rating
    getComplexityRating(complexity) {
        if (complexity <= 10) return 'Low';
        if (complexity <= 20) return 'Moderate';
        if (complexity <= 50) return 'High';
        return 'Very High';
    }

    // Analyze functions
    analyzeFunctions(code) {
        // Function declarations
        const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*{/g;
        let match;
        
        while ((match = functionRegex.exec(code)) !== null) {
            this.functions.push({
                name: match[1],
                type: 'declaration',
                line: this.getLineNumber(code, match.index)
            });
        }
        
        // Arrow functions
        const arrowRegex = /(\w+)\s*=\s*\([^)]*\)\s*=>/g;
        while ((match = arrowRegex.exec(code)) !== null) {
            this.functions.push({
                name: match[1],
                type: 'arrow',
                line: this.getLineNumber(code, match.index)
            });
        }
        
        // Function expressions
        const exprRegex = /(\w+)\s*=\s*function\s*\([^)]*\)/g;
        while ((match = exprRegex.exec(code)) !== null) {
            this.functions.push({
                name: match[1],
                type: 'expression',
                line: this.getLineNumber(code, match.index)
            });
        }
        
        this.metrics.functionCount = this.functions.length;
    }

    // Analyze classes
    analyzeClasses(code) {
        const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
        let match;
        
        while ((match = classRegex.exec(code)) !== null) {
            this.classes.push({
                name: match[1],
                extends: match[2] || null,
                line: this.getLineNumber(code, match.index)
            });
        }
        
        this.metrics.classCount = this.classes.length;
    }

    // Analyze variables
    analyzeVariables(code) {
        const patterns = [
            { type: 'const', regex: /const\s+(\w+)/g },
            { type: 'let', regex: /let\s+(\w+)/g },
            { type: 'var', regex: /var\s+(\w+)/g }
        ];
        
        let constCount = 0, letCount = 0, varCount = 0;
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(code)) !== null) {
                this.variables.push({
                    name: match[1],
                    type: pattern.type,
                    line: this.getLineNumber(code, match.index)
                });
                
                if (pattern.type === 'const') constCount++;
                else if (pattern.type === 'let') letCount++;
                else if (pattern.type === 'var') varCount++;
            }
        }
        
        this.metrics.variables = { const: constCount, let: letCount, var: varCount };
    }

    // Analyze dependencies
    analyzeDependencies(code) {
        // Import statements
        const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
        let match;
        
        while ((match = importRegex.exec(code)) !== null) {
            this.dependencies.add(match[1]);
        }
        
        // Require statements
        const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        while ((match = requireRegex.exec(code)) !== null) {
            this.dependencies.add(match[1]);
        }
        
        this.metrics.dependencyCount = this.dependencies.size;
    }

    // Code quality checks
    checkCodeQuality(originalCode, cleanCode) {
        this.checkCodeSmells(cleanCode);
        this.checkBestPractices(originalCode, cleanCode);
        this.checkSecurity(cleanCode);
        this.checkPerformance(cleanCode);
    }

    // Check for code smells
    checkCodeSmells(code) {
        // Long functions
        const functions = code.match(/function[^{]*{[^{}]*(?:{[^{}]*}[^{}]*)*}/g) || [];
        for (const func of functions) {
            const lines = func.split('\n').length;
            if (lines > 50) {
                this.issues.push({
                    type: 'code_smell',
                    severity: 'warning',
                    message: 'Function is too long (>50 lines)',
                    suggestion: 'Consider breaking this function into smaller functions'
                });
            }
        }
        
        // Deep nesting
        if (this.complexity.maxNesting > 4) {
            this.issues.push({
                type: 'code_smell',
                severity: 'warning',
                message: `Deep nesting detected (${this.complexity.maxNesting} levels)`,
                suggestion: 'Consider extracting nested logic into separate functions'
            });
        }
        
        // Magic numbers
        const magicNumbers = code.match(/\b\d{2,}\b/g) || [];
        if (magicNumbers.length > 5) {
            this.issues.push({
                type: 'code_smell',
                severity: 'info',
                message: 'Multiple magic numbers detected',
                suggestion: 'Consider using named constants for numeric literals'
            });
        }
    }

    // Check best practices
    checkBestPractices(originalCode, cleanCode) {
        // Check for var usage
        if (this.metrics.variables.var > 0) {
            this.issues.push({
                type: 'best_practice',
                severity: 'warning',
                message: 'Use of \'var\' keyword detected',
                suggestion: 'Consider using \'let\' or \'const\' instead of \'var\''
            });
        }
        
        // Check for console.log in production code
        const consoleCount = (cleanCode.match(/console\./g) || []).length;
        if (consoleCount > 0) {
            this.issues.push({
                type: 'best_practice',
                severity: 'info',
                message: `Console statements found (${consoleCount})`,
                suggestion: 'Remove console statements before production deployment'
            });
        }
        
        // Check for TODO/FIXME comments
        const todoCount = (originalCode.match(/\/\/.*TODO|\/\*.*TODO.*\*\//gi) || []).length;
        const fixmeCount = (originalCode.match(/\/\/.*FIXME|\/\*.*FIXME.*\*\//gi) || []).length;
        
        if (todoCount + fixmeCount > 0) {
            this.issues.push({
                type: 'best_practice',
                severity: 'info',
                message: `Unresolved TODOs/FIXMEs found (${todoCount + fixmeCount})`,
                suggestion: 'Address pending TODO and FIXME comments'
            });
        }
    }

    // Check security issues
    checkSecurity(code) {
        // eval usage
        if (code.includes('eval(')) {
            this.issues.push({
                type: 'security',
                severity: 'error',
                message: 'Use of eval() detected',
                suggestion: 'Avoid eval() as it can execute arbitrary code'
            });
        }
        
        // innerHTML usage
        if (code.includes('innerHTML')) {
            this.issues.push({
                type: 'security',
                severity: 'warning',
                message: 'Use of innerHTML detected',
                suggestion: 'Consider using textContent or createElement for security'
            });
        }
        
        // document.write usage
        if (code.includes('document.write')) {
            this.issues.push({
                type: 'security',
                severity: 'warning',
                message: 'Use of document.write detected',
                suggestion: 'Avoid document.write as it can be a security risk'
            });
        }
    }

    // Check performance issues
    checkPerformance(code) {
        // Nested loops
        const nestedLoopRegex = /for\s*\([^}]*{\s*[^}]*for\s*\(/g;
        const nestedLoops = code.match(nestedLoopRegex);
        if (nestedLoops && nestedLoops.length > 0) {
            this.issues.push({
                type: 'performance',
                severity: 'warning',
                message: 'Nested loops detected',
                suggestion: 'Consider optimizing nested loops or using more efficient algorithms'
            });
        }
        
        // Global variables
        const globalVars = code.match(/^\s*(var|let|const)\s+\w+/gm) || [];
        if (globalVars.length > 10) {
            this.issues.push({
                type: 'performance',
                severity: 'info',
                message: 'Many global variables detected',
                suggestion: 'Consider organizing code into modules or namespaces'
            });
        }
    }

    // Get line number from character index
    getLineNumber(code, index) {
        return code.substring(0, index).split('\n').length;
    }

    // Generate comprehensive report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            complexity: this.complexity,
            functions: this.functions,
            classes: this.classes,
            dependencies: Array.from(this.dependencies),
            issues: this.issues,
            summary: this.generateSummary()
        };
        
        return report;
    }

    // Generate analysis summary
    generateSummary() {
        const errorCount = this.issues.filter(i => i.severity === 'error').length;
        const warningCount = this.issues.filter(i => i.severity === 'warning').length;
        const infoCount = this.issues.filter(i => i.severity === 'info').length;
        
        let grade = 'A';
        let score = 100;
        
        // Calculate score based on issues and complexity
        score -= errorCount * 20;
        score -= warningCount * 10;
        score -= infoCount * 5;
        score -= Math.max(0, this.complexity.cyclomatic - 10) * 2;
        score -= Math.max(0, this.complexity.maxNesting - 3) * 5;
        
        if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';
        else if (score >= 60) grade = 'D';
        else grade = 'F';
        
        return {
            grade: grade,
            score: Math.max(0, score),
            totalIssues: this.issues.length,
            issueBreakdown: {
                errors: errorCount,
                warnings: warningCount,
                info: infoCount
            },
            codeHealth: this.getCodeHealth(),
            recommendations: this.getTopRecommendations()
        };
    }

    // Assess overall code health
    getCodeHealth() {
        const health = [];
        
        if (this.complexity.rating === 'Low') {
            health.push('✅ Low complexity');
        } else {
            health.push(`⚠️ ${this.complexity.rating} complexity`);
        }
        
        if (this.metrics.commentRatio >= 10) {
            health.push('✅ Well documented');
        } else {
            health.push('⚠️ Needs more comments');
        }
        
        if (this.metrics.variables.var === 0) {
            health.push('✅ Modern variable declarations');
        } else {
            health.push('⚠️ Legacy variable declarations');
        }
        
        if (this.issues.filter(i => i.type === 'security').length === 0) {
            health.push('✅ No security issues');
        } else {
            health.push('🚨 Security concerns');
        }
        
        return health;
    }

    // Get top recommendations
    getTopRecommendations() {
        const recommendations = [];
        
        if (this.complexity.cyclomatic > 20) {
            recommendations.push('Reduce cyclomatic complexity by breaking down complex functions');
        }
        
        if (this.metrics.commentRatio < 10) {
            recommendations.push('Add more comments to improve code documentation');
        }
        
        if (this.metrics.variables.var > 0) {
            recommendations.push('Replace var declarations with let/const');
        }
        
        if (this.issues.filter(i => i.type === 'security').length > 0) {
            recommendations.push('Address security vulnerabilities immediately');
        }
        
        if (this.functions.length > 20) {
            recommendations.push('Consider organizing functions into modules or classes');
        }
        
        return recommendations.slice(0, 5); // Top 5 recommendations
    }

    // Pretty print report
    printReport(report = null) {
        const r = report || this.generateReport();
        
        console.log('\n📊 JAVASCRIPT CODE ANALYSIS REPORT');
        console.log('=' .repeat(50));
        
        console.log('\n📈 METRICS:');
        console.log(`   Lines of Code: ${r.metrics.totalLines}`);
        console.log(`   Code Lines: ${r.metrics.codeLines}`);
        console.log(`   Comment Lines: ${r.metrics.commentLines} (${r.metrics.commentRatio}%)`);
        console.log(`   Functions: ${r.metrics.functionCount}`);
        console.log(`   Classes: ${r.metrics.classCount}`);
        console.log(`   Dependencies: ${r.metrics.dependencyCount}`);
        
        console.log('\n🔄 COMPLEXITY:');
        console.log(`   Cyclomatic Complexity: ${r.complexity.cyclomatic} (${r.complexity.rating})`);
        console.log(`   Max Nesting Depth: ${r.complexity.maxNesting}`);
        
        console.log('\n📋 SUMMARY:');
        console.log(`   Grade: ${r.summary.grade} (${r.summary.score}/100)`);
        console.log(`   Total Issues: ${r.summary.totalIssues}`);
        console.log(`   Errors: ${r.summary.issueBreakdown.errors}`);
        console.log(`   Warnings: ${r.summary.issueBreakdown.warnings}`);
        console.log(`   Info: ${r.summary.issueBreakdown.info}`);
        
        if (r.summary.codeHealth.length > 0) {
            console.log('\n❤️ CODE HEALTH:');
            r.summary.codeHealth.forEach(item => console.log(`   ${item}`));
        }
        
        if (r.issues.length > 0) {
            console.log('\n⚠️ ISSUES:');
            r.issues.slice(0, 10).forEach((issue, index) => {
                const icon = issue.severity === 'error' ? '🚨' : 
                           issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`   ${icon} ${issue.message}`);
                if (issue.suggestion) {
                    console.log(`      💡 ${issue.suggestion}`);
                }
            });
            
            if (r.issues.length > 10) {
                console.log(`   ... and ${r.issues.length - 10} more issues`);
            }
        }
        
        if (r.summary.recommendations.length > 0) {
            console.log('\n💡 TOP RECOMMENDATIONS:');
            r.summary.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        console.log('\n' + '=' .repeat(50));
    }
}

// Demo and utility functions
function analyzeFromFile(filePath) {
    if (typeof require === 'undefined') {
        console.log('❌ File reading not available in browser environment');
        return;
    }
    
    try {
        const fs = require('fs');
        const code = fs.readFileSync(filePath, 'utf8');
        const analyzer = new JavaScriptAnalyzer();
        const report = analyzer.analyze(code);
        analyzer.printReport(report);
        return report;
    } catch (error) {
        console.error('❌ Error reading file:', error.message);
    }
}

function runDemo() {
    console.log('🔍 JavaScript Code Analyzer Demo');
    console.log('================================');
    
    const sampleCode = `
// Sample JavaScript code for analysis
const users = [];
var globalCounter = 0;

function addUser(name, email) {
    if (!name || !email) {
        throw new Error('Missing required fields');
    }
    
    for (let i = 0; i < users.length; i++) {
        if (users[i].email === email) {
            console.log('User already exists');
            return false;
        }
    }
    
    const user = {
        id: globalCounter++,
        name: name,
        email: email,
        createdAt: new Date()
    };
    
    users.push(user);
    return true;
}

class UserManager {
    constructor() {
        this.users = [];
    }
    
    validateEmail(email) {
        return email.includes('@');
    }
    
    processUsers() {
        for (let i = 0; i < this.users.length; i++) {
            for (let j = 0; j < this.users[i].permissions.length; j++) {
                if (this.users[i].permissions[j] === 'admin') {
                    console.log('Admin user found');
                }
            }
        }
    }
}

// TODO: Add input validation
// FIXME: Handle edge cases
eval('console.log("This is dangerous")');
document.innerHTML = '<div>Dynamic content</div>';
    `;
    
    const analyzer = new JavaScriptAnalyzer();
    const report = analyzer.analyze(sampleCode);
    analyzer.printReport(report);
    
    console.log('\n📝 Usage Examples:');
    console.log('• const analyzer = new JavaScriptAnalyzer()');
    console.log('• const report = analyzer.analyze(codeString)');
    console.log('• analyzer.printReport(report)');
    console.log('• analyzeFromFile("path/to/file.js") // Node.js only');
    
    // Make analyzer globally available
    if (typeof window !== 'undefined') {
        window.analyzer = analyzer;
        window.analyzeFromFile = analyzeFromFile;
    } else if (typeof global !== 'undefined') {
        global.analyzer = analyzer;
        global.analyzeFromFile = analyzeFromFile;
    }
    
    return analyzer;
}

// Auto-start demo
if (typeof module !== 'undefined' && require.main === module) {
    runDemo();
} else if (typeof window !== 'undefined') {
    runDemo();
}

// Export for module use
if (typeof module !== 'undefined') {
    module.exports = { JavaScriptAnalyzer, analyzeFromFile, runDemo };
};