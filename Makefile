.PHONY: install opencode pi migrate repair uninstall

# install one or both homes at a time (flocked):
#   make install        → both
#   make opencode       → only opencode (~/.opencode + ~/.config/opencode)
#   make pi             → only pi (~/.pi)
install:
	./install.sh install all

opencode:
	./install.sh install opencode

pi:
	./install.sh install pi

migrate:
	./install.sh migrate $(filter-out $@,$(MAKECMDGOALS))

repair:
	./install.sh repair $(filter-out $@,$(MAKECMDGOALS))

uninstall:
	./install.sh uninstall $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
