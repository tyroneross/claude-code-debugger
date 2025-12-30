# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-12-28

### Added
- **Parallel Assessment System**: Domain-specific assessors run concurrently for complex debugging
  - `/assess` command spawns multiple assessor agents in parallel
  - Domain-specific agents: database, frontend, API, performance
  - Automatic domain detection from symptom keywords
  - Result aggregation with confidence-based ranking
  - Priority ranking for recommended actions
- **Trace Ingestion Framework**: Ingest traces from external observability tools
  - OpenTelemetry adapter for distributed tracing
  - Sentry adapter for error tracking integration
  - LangChain adapter for LLM observability
  - Browser adapter for performance traces
  - Token-efficient trace summarization
  - Cross-reference with debugging memory
- **Parallel Retrieval**: Concurrent memory search across patterns and incidents
  - `parallelSearch()` - parallel keyword search
  - `parallelPatternMatch()` - concurrent pattern matching
  - `parallelMemoryCheck()` - unified parallel memory check
- **Assessment Orchestration**: Coordinate multi-domain debugging analysis
  - `detectDomains()` - identify relevant domains from symptom
  - `generateAssessorPrompts()` - create domain-specific prompts
  - `aggregateResults()` - merge and rank assessment results
- **Plugin Marketplace Support**: Install via Claude Code plugin marketplace

### Changed
- Plugin structure updated with agents directory
- Enhanced type exports for assessment and trace types
- Improved token efficiency for large codebases

## [1.3.0] - 2025-12-27

### Added
- **Claude Code Plugin Infrastructure**: Full plugin support for Claude Code
  - Plugin manifest (`plugin.json`) with commands, skills, hooks, agents
  - Slash commands: `/debugger`, `/debugger-status`, `/debugger-scan`, `/feedback`, `/update`
  - Auto-activating debugging skill
  - Session stop hook for automatic audit mining
- **Marketplace Configuration**: Plugin marketplace integration
  - `marketplace.json` for plugin distribution
  - Installation via `/plugin marketplace add`

### Fixed
- Comprehensive null safety for incidents across codebase
- Null check for `incident.symptom` in all search operations

## [1.2.5] - 2025-12-02

### Fixed
- CI/CD: Fixed trusted publishing configuration

## [1.2.4] - 2025-12-02

### Fixed
- CI/CD: Reverted to OIDC trusted publishers

## [1.2.3] - 2025-12-02

### Fixed
- CI/CD: Auto-publish on tag push workflow
- Updated README with slash commands documentation

## [1.2.2] - 2025-12-02

### Fixed
- CI/CD: Trusted publisher workflow updates

## [1.2.1] - 2025-12-02

### Fixed
- **Critical**: Removed circular dependency (package listed itself as dependency)
- **Critical**: Fixed auto-setup not running on install (setup files now included in package)
- **Critical**: Fixed programmatic API not working (`main` entry now points to correct path)
- Fixed CLI branding inconsistency (`claude-memory` → `claude-code-debugger`)
- CLI version now reads from package.json instead of hardcoded value
- Moved `@types/natural` and `@types/prompts` to devDependencies

### Changed
- Improved postinstall script reliability
- Better error handling in auto-setup

## [1.2.0] - 2025-01-12

### Added
- **Interactive Verification System**: Guided CLI prompts to complete incident details
  - Smart prompts for root cause, fix details, verification status, and tags
  - Contextual questions based on existing incident data
  - Real-time quality score calculation and feedback
  - Automatic tag suggestions from symptom analysis
  - User-friendly validation with clear error messages
- **Quality Scoring**: Automatic calculation of incident completeness (0-100%)
  - 30% weight on root cause analysis (description + confidence)
  - 30% weight on fix details (approach + documented changes)
  - 20% weight on verification status (tests + user journey)
  - 20% weight on documentation (tags + prevention advice)
- **Quality Feedback Generator**: Human-readable feedback with improvement suggestions
- New `calculateQualityScore()` function for programmatic quality assessment
- New `generateQualityFeedback()` function for quality reports
- New `buildIncidentInteractive()` function for guided incident completion
- Tag suggestion algorithm based on symptom keyword analysis
- Visual quality indicators (🌟/✅/⚠️) in storage confirmation

### Changed
- `storeIncident()` now accepts `interactive: boolean` option
- `storeIncident()` automatically calculates quality score if not present
- Storage confirmation now displays quality score percentage
- Incident completeness tracking enhanced with quality_score field

### Dependencies
- Added `prompts` (^2.4.2) for interactive CLI prompts
- Added `@types/prompts` (^2.4.9) for TypeScript support

### Documentation
- New comprehensive guide: `docs/INTERACTIVE_VERIFICATION.md`
- Updated README with interactive verification examples
- Added quality scoring rubric documentation
- Created test examples demonstrating quality score calculation

## [1.1.0] - 2025-01-11

### Added
- **Pattern Extraction**: Automatically identify recurring issues and create reusable solution templates
- **Audit Trail Mining**: Recover missed incidents from `.claude/audit/` files
- Configurable storage paths (local vs shared mode)
- Memory configuration system with environment variable support
- Enhanced similarity search using TF-IDF and cosine similarity
- Pattern usage tracking and success rate monitoring

### Changed
- Improved incident retrieval with keyword-based similarity
- Enhanced search functionality with multiple filtering options
- Better error handling and validation

### Documentation
- Added pattern extraction guide
- Added audit mining guide
- Updated API documentation

## [1.0.0] - 2025-01-10

### Added
- Initial release of Claude Memory debugging system
- Incident storage and retrieval
- Basic similarity search
- CLI interface
- Programmatic API
- Local and shared storage modes
- Incident validation
- Memory statistics

### Documentation
- Initial README
- API documentation
- Usage examples
