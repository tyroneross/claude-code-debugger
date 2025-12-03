# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
