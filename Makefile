.PHONY: opencode

opencode:
	./install.sh $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
